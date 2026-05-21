import { Request, Response } from "express";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { KnowledgeItem } from "../entities/KnowledgeItem.js";
import { Ticket } from "../entities/Ticket.js";
import { Specialization } from "../entities/Specialization.js";
import { Problem } from "../entities/problem.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { TicketPriority } from "../enums/TicketPriority.enum.js";
import logger from "../utils/logger.js";
import { invalidateTicketAnalyticsCache } from "../services/tickets/ticket-cache.service.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

// ─── Tool Definitions ────────────────────────────────────────────────────────
// These are the tools the LLM can call. Kept minimal to save tokens.

const TOOLS_DESCRIPTION = `
You have access to these tools. Call them by outputting ONLY a JSON object on its own line:

{"tool":"search_kb","query":"<search terms>"}
  → Search knowledge base for solutions

{"tool":"get_specializations"}
  → Get list of available support specializations

{"tool":"get_problems","specializationId":"<id>"}
  → Get problems for a specialization (use after get_specializations)

{"tool":"create_ticket","title":"...","description":"...","specializationId":"...","problemId":"..."}
  → Prepare a ticket preview for user review

Rules:
- Call ONE tool at a time
- After getting tool results, continue helping the user
- Ask concise follow-up questions until you know: affected service/app, exact symptom/error, when it started, who/what is impacted, and what the user already tried
- For vague messages like "I have problem with Office", ask targeted questions before choosing the ticket title or description
- Use get_specializations and get_problems to choose the best specialization and problem type
- Only call create_ticket when you have title, description, specializationId, and problemId
- Use exact id values from tool results. Do not put specialization/problem names in specializationId or problemId
- The frontend will show the preview and ask the user to submit or save as draft
- Respond in the user's language (Arabic or English)
`;

const SYSTEM_PROMPT_EN = `You are a technical support intake assistant. Your main job is to collect enough detail to create a useful support ticket.
Ask one focused question at a time when information is missing. Do not invent details. When enough information is available, choose the best specialization/problem type and prepare a clear ticket preview with a short title and a complete description.
${TOOLS_DESCRIPTION}`;

const SYSTEM_PROMPT_AR = `أنت مساعد استقبال للدعم التقني. مهمتك الأساسية جمع معلومات كافية لإنشاء تذكرة دعم مفيدة.
اسأل سؤالاً واحداً ومحدداً عندما تكون المعلومات ناقصة. لا تخترع تفاصيل. عندما تكتمل المعلومات، اختر أفضل تخصص ونوع مشكلة وجهز معاينة تذكرة بعنوان قصير ووصف واضح.
${TOOLS_DESCRIPTION}`;

// ─── Tool Executors ──────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
    return typeof value === "string" && UUID_RE.test(value.trim());
}

function normalizeLookupText(value: unknown): string {
    return typeof value === "string"
        ? value
            .trim()
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .replace(/\s+/g, " ")
            .trim()
        : "";
}

function getLocalizedName(entity: any, lang: string): string {
    const name = entity?.name;
    if (typeof name === "string") return name;
    return name?.[lang] || name?.en || name?.ar || "";
}

function getLookupCandidates(entity: any): string[] {
    const name = entity?.name;
    if (typeof name === "string") return [name];
    return [name?.en, name?.ar].filter(Boolean);
}

function matchesEntityName(entity: any, rawLookup: unknown): boolean {
    const lookup = normalizeLookupText(rawLookup);
    if (!lookup) return false;

    const candidates = getLookupCandidates(entity).map(normalizeLookupText).filter(Boolean);
    return candidates.some(candidate =>
        candidate === lookup ||
        candidate.includes(lookup) ||
        lookup.includes(candidate)
    );
}

async function resolveSpecialization(lookup: unknown, lang: string): Promise<Specialization | null> {
    const repo = PostgresDataSource.getRepository(Specialization);
    const value = typeof lookup === "string" ? lookup.trim() : "";
    if (!value) return null;

    if (isUuid(value)) {
        return repo.findOne({ where: { id: value } });
    }

    const specs = await repo.find({ order: { createdAt: "DESC" } });
    return specs.find(spec => matchesEntityName(spec, value)) || null;
}

async function resolveProblem(
    lookup: unknown,
    lang: string,
    specialization?: Specialization | null,
): Promise<Problem | null> {
    const repo = PostgresDataSource.getRepository(Problem);
    const value = typeof lookup === "string" ? lookup.trim() : "";
    if (!value) return null;

    if (isUuid(value)) {
        const problem = await repo.findOne({ where: { id: value }, relations: ["specialization"] });
        if (!problem || !specialization) return problem;
        return problem.specialization?.id === specialization.id ? problem : null;
    }

    const problems = await repo.find({
        where: specialization ? { specialization: { id: specialization.id } as any } : {},
        relations: ["specialization"],
    });
    return problems.find(problem => matchesEntityName(problem, value)) || null;
}

function getToolLookup(toolCall: any, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = toolCall?.[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
}

async function executeTool(toolCall: any, language: string): Promise<string> {
    const lang = language === "ar" ? "ar" : "en";

    switch (toolCall.tool) {
        case "search_kb": {
            try {
                const repo = PostgresDataSource.getRepository(KnowledgeItem);
                const result = await KnowledgeItem.paginateAndSearch(repo, {
                    search: toolCall.query || "",
                    page: 1,
                    limit: 3,
                });
                if (result.items.length === 0) {
                    return lang === "ar" ? "لا توجد نتائج في قاعدة المعرفة." : "No results found in knowledge base.";
                }
                return result.items.map(item => {
                    const title = lang === "ar" ? item.title_ar : item.title_en;
                    const desc = lang === "ar" ? item.description_ar : item.description_en;
                    const content = lang === "ar" ? (item.content_ar || item.content_en) : (item.content_en || item.content_ar);
                    return `**${title}**\n${desc}\n${content ? content.substring(0, 300) : ""}`;
                }).join("\n\n---\n\n");
            } catch {
                return "Knowledge base search failed.";
            }
        }

        case "get_specializations": {
            try {
                const repo = PostgresDataSource.getRepository(Specialization);
                const specs = await repo.find({ order: { createdAt: "DESC" } });
                if (specs.length === 0) return "No specializations found.";
                return specs.map(s => {
                    const name = s.name[lang as "en" | "ar"] || s.name.en || s.name.ar || "Unknown";
                    return `- ${name} (id: ${s.id})`;
                }).join("\n");
            } catch {
                return "Failed to get specializations.";
            }
        }

        case "get_problems": {
            try {
                const repo = PostgresDataSource.getRepository(Problem);
                const where: any = {};
                const specializationLookup = getToolLookup(toolCall, "specializationId", "specializationName", "specialization");
                if (specializationLookup) {
                    const specialization = await resolveSpecialization(specializationLookup, lang);
                    if (!specialization) {
                        return lang === "ar"
                            ? "لم أجد هذا التخصص. استخدم get_specializations واختر id من القائمة."
                            : "Specialization not found. Use get_specializations and choose an id from the list.";
                    }
                    where.specialization = { id: specialization.id };
                }
                const problems = await repo.find({ where, relations: ["specialization"] });
                if (problems.length === 0) return "No problems found for this specialization.";
                return problems.map(p => {
                    const name = getLocalizedName(p, lang) || "Unknown";
                    return `- ${name} (id: ${p.id})`;
                }).join("\n");
            } catch {
                return "Failed to get problems.";
            }
        }

        case "create_ticket": {
            const specializationLookup = getToolLookup(toolCall, "specializationId", "specializationName", "specialization");
            const problemLookup = getToolLookup(toolCall, "problemId", "problemName", "problem");
            const specialization = specializationLookup
                ? await resolveSpecialization(specializationLookup, lang)
                : null;

            if (specializationLookup && !specialization) {
                return lang === "ar"
                    ? "لم أجد التخصص المطلوب. استخدم get_specializations واختر id من القائمة."
                    : "I could not find that specialization. Use get_specializations and choose an id from the list.";
            }

            const problem = problemLookup
                ? await resolveProblem(problemLookup, lang, specialization)
                : null;

            if (problemLookup && !problem) {
                return lang === "ar"
                    ? "لم أجد نوع المشكلة المطلوب لهذا التخصص. استخدم get_problems واختر id من القائمة."
                    : "I could not find that problem type for the selected specialization. Use get_problems and choose an id from the list.";
            }

            const resolvedSpecialization = specialization || problem?.specialization || null;
            const specializationName = resolvedSpecialization
                ? getLocalizedName(resolvedSpecialization, lang)
                : undefined;
            const problemName = problem
                ? getLocalizedName(problem, lang)
                : undefined;

            if (!toolCall.title?.trim() || !toolCall.description?.trim() || !resolvedSpecialization || !problem) {
                return lang === "ar"
                    ? "أحتاج إلى عنوان ووصف وتخصص ونوع مشكلة قبل تجهيز معاينة التذكرة."
                    : "I need a title, description, specialization, and problem type before preparing the ticket preview.";
            }

            // Return a special marker. The frontend asks the user to review before saving.
            return JSON.stringify({
                __pending_ticket__: true,
                title: toolCall.title.trim(),
                description: toolCall.description.trim(),
                specializationId: resolvedSpecialization.id,
                problemId: problem.id,
                specializationName,
                problemName,
            });
        }

        default:
            return `Unknown tool: ${toolCall.tool}`;
    }
}

// ─── Parse tool call from LLM output ─────────────────────────────────────────

function parseToolCall(text: string): any | null {
    const matches = text.match(/\{[\s\S]*?\}/g);
    if (!matches) return null;
    for (const match of matches) {
        try {
            const parsed = JSON.parse(match);
            if (parsed?.tool) return parsed;
        } catch {
            // Keep scanning; the model may include prose or malformed snippets.
        }
    }
    return null;
}

// ─── Call Ollama (non-streaming, for tool loop) ───────────────────────────────

async function callOllama(messages: any[]): Promise<string> {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages,
            stream: false,
            options: {
                temperature: 0.2,
                num_ctx: 2048,
                num_predict: 384,
            },
        }),
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    const data = await response.json() as any;
    return data.message?.content || "";
}

// ─── POST /api/v1/ai-assistant/chat ─────────────────────────────────────────
// Agentic loop: LLM → tool call → result → LLM → ... → final answer (streamed)

export const aiAssistantChat = async (req: Request, res: Response) => {
    const { messages, language = "en" } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ toolStatus: language === "ar" ? "أفكر" : "thinking" })}\n\n`);

    const systemPrompt = language === "ar" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;

    // Build conversation with system prompt
    const conversation: any[] = [
        { role: "system", content: systemPrompt },
        ...messages.slice(-8),
    ];

    try {
        let pendingTicket: any = null;
        const MAX_TOOL_CALLS = 4; // Prevent infinite loops

        for (let i = 0; i < MAX_TOOL_CALLS; i++) {
            // Call LLM (non-streaming for tool loop)
            const llmResponse = await callOllama(conversation);

            // Check if LLM wants to call a tool
            const toolCall = parseToolCall(llmResponse);

            if (!toolCall) {
                // No tool call - this is the final answer, stream it
                // Stream word by word for better UX
                const words = llmResponse.split(/(\s+)/);
                for (const word of words) {
                    if (word) {
                        res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
                    }
                }

                // Check for pending ticket action
                if (pendingTicket) {
                    res.write(`data: ${JSON.stringify({ ticketAction: pendingTicket })}\n\n`);
                }

                res.write("data: [DONE]\n\n");
                res.end();
                return;
            }

            // Execute the tool
            logger.info(`[ai-assistant] Tool call: ${toolCall.tool}`);

            // Notify frontend that we're fetching data
            const toolName = toolCall.tool === "search_kb" ? (language === "ar" ? "حلول" : "solutions")
                : toolCall.tool === "get_specializations" ? (language === "ar" ? "التخصصات" : "specializations")
                : toolCall.tool === "get_problems" ? (language === "ar" ? "المشاكل" : "problems")
                : (language === "ar" ? "بيانات" : "data");
            res.write(`data: ${JSON.stringify({ toolStatus: toolName })}\n\n`);

            const toolResult = await executeTool(toolCall, language);

            // Check if this is a pending ticket
            try {
                const parsed = JSON.parse(toolResult);
                if (parsed.__pending_ticket__) {
                    pendingTicket = {
                        title: parsed.title,
                        description: parsed.description,
                        specializationId: parsed.specializationId,
                        problemId: parsed.problemId,
                        specializationName: parsed.specializationName,
                        problemName: parsed.problemName,
                    };
                    const previewMessage = language === "ar"
                        ? "جهزت معاينة للتذكرة. راجع العنوان والوصف ثم اختر الإرسال أو الحفظ كمسودة."
                        : "I prepared a ticket preview. Review the title and description, then submit it or save it as a draft.";
                    res.write(`data: ${JSON.stringify({ content: previewMessage })}\n\n`);
                    res.write(`data: ${JSON.stringify({ ticketAction: pendingTicket })}\n\n`);
                    res.write("data: [DONE]\n\n");
                    res.end();
                    return;
                }
            } catch { /* not JSON */ }

            // Add tool call and result to conversation
            conversation.push({ role: "assistant", content: llmResponse });
            conversation.push({
                role: "user",
                content: `[Tool result for ${toolCall.tool}]:\n${toolResult}`,
            });
        }

        // If we hit max tool calls, ask LLM for final answer
        const finalResponse = await callOllama(conversation);
        const words = finalResponse.split(/(\s+)/);
        for (const word of words) {
            if (word) res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
        }
        if (pendingTicket) {
            res.write(`data: ${JSON.stringify({ ticketAction: pendingTicket })}\n\n`);
        }
        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error: any) {
        logger.error("[ai-assistant] Chat error:", error);
        const fallback = language === "ar"
            ? "عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. يمكنك إنشاء تذكرة مباشرة من قسم التذاكر."
            : "Sorry, the AI service is currently unavailable. You can create a ticket directly from the Tickets section.";
        res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
    }
};

// ─── POST /api/v1/ai-assistant/create-ticket ────────────────────────────────

export const aiCreateTicket = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { title, description, specializationId, problemId, isDraft } = req.body;
    if (!title?.trim() || !description?.trim()) {
        return res.status(400).json({ error: "Title and description are required" });
    }

    try {
        const ticketRepo = PostgresDataSource.getRepository(Ticket);
        const lang = req.body?.language === "ar" ? "ar" : "en";
        const specialization = specializationId
            ? await resolveSpecialization(specializationId, lang)
            : null;
        const problem = problemId
            ? await resolveProblem(problemId, lang, specialization)
            : null;
        const resolvedSpecialization = specialization || problem?.specialization || null;

        if (specializationId && !resolvedSpecialization) {
            return res.status(400).json({ error: "Invalid specialization" });
        }

        if (problemId && !problem) {
            return res.status(400).json({ error: "Invalid problem type" });
        }

        const ticketData: any = {
            title: title.trim().substring(0, 100),
            description: description.trim(),
            status: isDraft ? TicketStatus.DRAFT : TicketStatus.OPEN,
            priority: TicketPriority.NA,
            requester: { id: user.id },
        };

        if (resolvedSpecialization) ticketData.specialization = { id: resolvedSpecialization.id };
        if (problem) ticketData.problem = { id: problem.id };

        const ticket = ticketRepo.create(ticketData);
        const saved = await ticketRepo.save(ticket) as any;
        const savedTicket = Array.isArray(saved) ? saved[0] : saved;
        await invalidateTicketAnalyticsCache();

        logger.info(`[ai-assistant] Ticket #${savedTicket.ticket_number} created by requester ${user.id}`);

        return res.status(201).json({
            success: true,
            ticketId: savedTicket.id,
            ticketNumber: savedTicket.ticket_number,
            isDraft: !!isDraft,
        });
    } catch (error: any) {
        logger.error("[ai-assistant] Ticket creation error:", error);
        return res.status(500).json({ error: "Failed to create ticket" });
    }
};

// ─── GET /api/v1/ai-assistant/health ────────────────────────────────────────

export const aiAssistantHealth = async (_req: Request, res: Response) => {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
            signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
            const data = await response.json() as any;
            const models = data.models?.map((m: any) => m.name) || [];
            return res.json({ available: true, models });
        }
        return res.json({ available: false });
    } catch {
        return res.json({ available: false });
    }
};

// ─── Warm up the model on startup ────────────────────────────────────────────

export async function warmUpOllamaModel(): Promise<void> {
    try {
        logger.info(`[ai-assistant] Warming up model: ${OLLAMA_MODEL} at ${OLLAMA_HOST}`);
        const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [{ role: "user", content: "hi" }],
                stream: false,
                options: { num_predict: 1, num_ctx: 512 },
            }),
            signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
        });
        if (response.ok) {
            logger.info(`[ai-assistant] Model ${OLLAMA_MODEL} warmed up successfully`);
        }
    } catch (err: any) {
        logger.warn(`[ai-assistant] Model warm-up skipped: ${err.message}`);
    }
}
