import { Request, Response } from "express";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { KnowledgeItem } from "../entities/KnowledgeItem.js";
import { Ticket } from "../entities/Ticket.js";
import { User } from "../entities/User.js";
import { Specialization } from "../entities/Specialization.js";
import { Problem } from "../entities/problem.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { TicketPriority } from "../enums/TicketPriority.enum.js";
import logger from "../utils/logger.js";
import { invalidateTicketAnalyticsCache } from "../services/tickets/ticket-cache.service.js";
import { getAiSettings } from "../services/site-settings.service.js";

const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

// ─── AI Provider Detection ────────────────────────────────────────────────────
//
// Two modes:
//   1. LOCAL (Ollama)  — no API key, chatUrl = http://localhost:11434
//      → POST {chatUrl}/api/chat  with Ollama body format
//   2. REMOTE (OpenAI-compatible) — has API key, chatUrl = https://openrouter.ai/api/v1 etc.
//      → POST {chatUrl}/chat/completions  with OpenAI body format
//
// Detection: if apiKey is set → remote/OpenAI-compatible, else → local Ollama.

interface AiSettings {
    enabled: boolean;
    modelName: string;
    apiKey: string | null;
    chatUrl: string;
}

function isRemoteProvider(settings: AiSettings): boolean {
    return !!settings.apiKey;
}

// ─── Unified AI call ──────────────────────────────────────────────────────────

async function callAi(
    messages: { role: string; content: string }[],
    settings: AiSettings,
    opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
    const { temperature = 0.2, maxTokens = 512 } = opts;
    const remote = isRemoteProvider(settings);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.apiKey) {
        headers["Authorization"] = `Bearer ${settings.apiKey}`;
    }

    let url: string;
    let body: object;

    if (remote) {
        // OpenAI-compatible format (OpenRouter, OpenAI, Groq, Together, etc.)
        url = `${settings.chatUrl.replace(/\/$/, "")}/chat/completions`;
        body = {
            model: settings.modelName,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: false,
        };
    } else {
        // Ollama local format
        url = `${settings.chatUrl.replace(/\/$/, "")}/api/chat`;
        body = {
            model: settings.modelName,
            messages,
            stream: false,
            options: {
                temperature,
                num_ctx: 2048,
                num_predict: maxTokens,
            },
        };
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`AI service error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json() as any;

    // OpenAI format: data.choices[0].message.content
    // Ollama format: data.message.content
    return (
        data?.choices?.[0]?.message?.content ||
        data?.message?.content ||
        ""
    );
}

// ─── Health check helper ──────────────────────────────────────────────────────

async function checkAiHealth(settings: AiSettings): Promise<{ available: boolean; models?: string[] }> {
    const remote = isRemoteProvider(settings);
    const headers: Record<string, string> = {};
    if (settings.apiKey) headers["Authorization"] = `Bearer ${settings.apiKey}`;

    if (remote) {
        // For remote providers, do a lightweight models list call
        try {
            const url = `${settings.chatUrl.replace(/\/$/, "")}/models`;
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                const data = await res.json() as any;
                const models = (data?.data || []).map((m: any) => m.id).slice(0, 10);
                return { available: true, models };
            }
            // Some providers don't expose /models — treat as available if we got any response
            return { available: res.status < 500 };
        } catch {
            return { available: false };
        }
    } else {
        // Ollama: use /api/tags
        try {
            const res = await fetch(`${settings.chatUrl.replace(/\/$/, "")}/api/tags`, {
                headers,
                signal: AbortSignal.timeout(5000),
            });
            if (res.ok) {
                const data = await res.json() as any;
                const models = (data?.models || []).map((m: any) => m.name);
                return { available: true, models };
            }
            return { available: false };
        } catch {
            return { available: false };
        }
    }
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS_DESCRIPTION = `
You MUST call tools using a JSON object on its own line (or in a code block). Supported formats:
  {"tool":"get_specializations"}
  {"tool":"get_problems","specializationId":"<id from list>"}
  {"tool":"create_ticket","title":"...","description":"...","specializationId":"<id>","problemId":"<id>"}
  {"tool":"search_kb","query":"<terms>"}

Do NOT use XML tags or any other format. Output the raw JSON object only.

Rules:
- Call ONE tool at a time then wait for the result before proceeding
- ALWAYS call get_specializations first, then get_problems, then create_ticket
- Use the exact id values shown in brackets [id:...] from tool results — do not show ids to the user
- Once you have a title and description, ALWAYS call create_ticket immediately — pick the closest matching specialization and problem; the user can adjust later
- Respond in the user's language (Arabic or English)
`;

const SYSTEM_PROMPT_EN = `You are a technical support intake assistant. Your main job is to collect enough detail to create a useful support ticket.
Ask one focused question at a time when information is missing. Do not invent details. When enough information is available, choose the best specialization/problem type and prepare a clear ticket preview with a short title and a complete description.
${TOOLS_DESCRIPTION}`;

const SYSTEM_PROMPT_AR = `أنت مساعد استقبال للدعم التقني. مهمتك الأساسية جمع معلومات كافية لإنشاء تذكرة دعم مفيدة.
اسأل سؤالاً واحداً ومحدداً عندما تكون المعلومات ناقصة. لا تخترع تفاصيل. عندما تكتمل المعلومات، اختر أفضل تخصص ونوع مشكلة وجهز معاينة تذكرة بعنوان قصير ووصف واضح.
${TOOLS_DESCRIPTION}`;

// ─── Tool Executors ───────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
    return typeof value === "string" && UUID_RE.test(value.trim());
}

function normalizeLookupText(value: unknown): string {
    return typeof value === "string"
        ? value.trim().toLowerCase().normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .replace(/\s+/g, " ").trim()
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
    return candidates.some(c => c === lookup || c.includes(lookup) || lookup.includes(c));
}

async function resolveSpecialization(lookup: unknown, lang: string): Promise<Specialization | null> {
    const repo = PostgresDataSource.getRepository(Specialization);
    let value = typeof lookup === "string" ? lookup.trim() : "";
    if (!value) return null;
    // Extract id from [id:uuid] format
    const idMatch = value.match(/\[id:([^\]]+)\]/);
    if (idMatch) value = idMatch[1];
    if (isUuid(value)) return repo.findOne({ where: { id: value } });
    const specs = await repo.find({ order: { createdAt: "DESC" } });
    return specs.find(s => matchesEntityName(s, value)) || null;
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
        const p = await repo.findOne({ where: { id: value }, relations: ["specialization"] });
        if (!p || !specialization) return p;
        return p.specialization?.id === specialization.id ? p : null;
    }
    const problems = await repo.find({
        where: specialization ? { specialization: { id: specialization.id } as any } : {},
        relations: ["specialization"],
    });
    return problems.find(p => matchesEntityName(p, value)) || null;
}

function getToolLookup(toolCall: any, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const v = toolCall?.[key];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
}

async function executeTool(toolCall: any, language: string): Promise<string> {
    const lang = language === "ar" ? "ar" : "en";

    switch (toolCall.tool) {
        case "search_kb": {
            try {
                const repo = PostgresDataSource.getRepository(KnowledgeItem);
                const result = await KnowledgeItem.paginateAndSearch(repo, { search: toolCall.query || "", page: 1, limit: 3 });
                if (!result.items.length) return lang === "ar" ? "لا توجد نتائج في قاعدة المعرفة." : "No results found in knowledge base.";
                return result.items.map(item => {
                    const title = lang === "ar" ? item.title_ar : item.title_en;
                    const desc = lang === "ar" ? item.description_ar : item.description_en;
                    const content = lang === "ar" ? (item.content_ar || item.content_en) : (item.content_en || item.content_ar);
                    return `**${title}**\n${desc}\n${content ? content.substring(0, 300) : ""}`;
                }).join("\n\n---\n\n");
            } catch { return "Knowledge base search failed."; }
        }

        case "get_specializations": {
            try {
                const repo = PostgresDataSource.getRepository(Specialization);
                const specs = await repo.find({ order: { createdAt: "DESC" } });
                if (!specs.length) return "No specializations found.";
                // Include ids for the AI to use internally, but label clearly
                return specs.map(s => `- ${s.name[lang as "en" | "ar"] || s.name.en || s.name.ar || "Unknown"} [id:${s.id}]`).join("\n");
            } catch { return "Failed to get specializations."; }
        }

        case "get_problems": {
            try {
                const repo = PostgresDataSource.getRepository(Problem);
                const where: any = {};
                const specLookup = getToolLookup(toolCall, "specializationId", "specializationName", "specialization");
                if (specLookup) {
                    const spec = await resolveSpecialization(specLookup, lang);
                    if (!spec) return lang === "ar" ? "لم أجد هذا التخصص. استخدم get_specializations واختر id من القائمة." : "Specialization not found. Use get_specializations and choose an id from the list.";
                    where.specialization = { id: spec.id };
                }
                const problems = await repo.find({ where, relations: ["specialization"] });
                if (!problems.length) return "No problems found for this specialization.";
                return problems.map(p => `- ${getLocalizedName(p, lang) || "Unknown"} [id:${p.id}]`).join("\n");
            } catch { return "Failed to get problems."; }
        }

        case "create_ticket": {
            const specLookup = getToolLookup(toolCall, "specializationId", "specializationName", "specialization");
            const probLookup = getToolLookup(toolCall, "problemId", "problemName", "problem");

            // Extract id from [id:uuid] format if present
            const extractId = (v?: string) => {
                if (!v) return v;
                const m = v.match(/\[id:([^\]]+)\]/);
                return m ? m[1] : v;
            };

            const cleanSpecLookup = extractId(specLookup);
            const cleanProbLookup = extractId(probLookup);

            let spec = cleanSpecLookup ? await resolveSpecialization(cleanSpecLookup, lang) : null;

            // If no exact match, fall back to first available specialization
            if (!spec) {
                const allSpecs = await PostgresDataSource.getRepository(Specialization).find({ order: { createdAt: "DESC" } });
                spec = allSpecs[0] ?? null;
            }

            let prob = cleanProbLookup ? await resolveProblem(cleanProbLookup, lang, spec) : null;

            // If no exact match, fall back to first problem for the chosen specialization
            if (!prob && spec) {
                const allProbs = await PostgresDataSource.getRepository(Problem).find({
                    where: { specialization: { id: spec.id } as any },
                    relations: ["specialization"],
                    take: 1,
                });
                prob = allProbs[0] ?? null;
            }

            // If still no problem, get any problem
            if (!prob) {
                const anyProb = await PostgresDataSource.getRepository(Problem).find({ relations: ["specialization"], take: 1 });
                prob = anyProb[0] ?? null;
                if (prob && !spec) spec = prob.specialization ?? null;
            }

            const resolvedSpec = spec || prob?.specialization || null;

            if (!toolCall.title?.trim() || !toolCall.description?.trim()) {
                return lang === "ar" ? "أحتاج إلى عنوان ووصف قبل تجهيز معاينة التذكرة." : "I need a title and description before preparing the ticket preview.";
            }

            return JSON.stringify({
                __pending_ticket__: true,
                title: toolCall.title.trim(),
                description: toolCall.description.trim(),
                specializationId: resolvedSpec?.id ?? null,
                problemId: prob?.id ?? null,
                specializationName: resolvedSpec ? getLocalizedName(resolvedSpec, lang) : null,
                problemName: prob ? getLocalizedName(prob, lang) : null,
            });
        }

        default:
            return `Unknown tool: ${toolCall.tool}`;
    }
}

function parseToolCall(text: string): any | null {
    // First try standard JSON tool calls: {"tool":"name",...}
    const jsonMatches = text.match(/\{[\s\S]*?\}/g);
    if (jsonMatches) {
        for (const match of jsonMatches) {
            try {
                const parsed = JSON.parse(match);
                if (parsed?.tool) return parsed;
            } catch { /* keep scanning */ }
        }
    }

    // Fallback: handle XML-style tool calls some models emit
    // e.g. <tool_call>get_specializations</tool_call>
    // or   <longcat_tool_call>get_specializations {"specializationId":"..."}</longcat_tool_call>
    // or   <function_calls><invoke name="get_specializations">...</invoke></function_calls>
    const xmlTagMatch = text.match(/<(?:tool_call|longcat_tool_call|function_call|invoke)[^>]*>([\s\S]*?)<\/(?:tool_call|longcat_tool_call|function_call|invoke)>/i);
    if (xmlTagMatch) {
        const inner = xmlTagMatch[1].trim();
        // Try to parse the inner content as JSON first
        try {
            const parsed = JSON.parse(inner);
            if (parsed?.tool) return parsed;
        } catch { /* not JSON */ }

        // Otherwise try to extract tool name and any JSON args on the same line
        // Format: "tool_name" or "tool_name {args}" or "tool_name\n{args}"
        const nameMatch = inner.match(/^(\w+)\s*([\s\S]*)/);
        if (nameMatch) {
            const toolName = nameMatch[1].trim();
            const remainder = nameMatch[2].trim();
            const result: any = { tool: toolName };

            // Try to parse remainder as JSON args
            if (remainder) {
                try {
                    const args = JSON.parse(remainder.startsWith("{") ? remainder : `{${remainder}}`);
                    Object.assign(result, args);
                } catch {
                    // Extract key=value or key:"value" pairs
                    const kvPairs = remainder.matchAll(/(\w+)\s*[:=]\s*"([^"]+)"/g);
                    for (const [, key, value] of kvPairs) {
                        result[key] = value;
                    }
                }
            }

            if (result.tool) return result;
        }
    }

    // Also handle markdown code block tool calls: ```json\n{"tool":...}\n```
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
        try {
            const parsed = JSON.parse(codeBlockMatch[1]);
            if (parsed?.tool) return parsed;
        } catch { /* ignore */ }
    }

    return null;
}

// ─── POST /api/v1/ai-assistant/chat ──────────────────────────────────────────

export const aiAssistantChat = async (req: Request, res: Response) => {
    const { messages, language = "en" } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ toolStatus: language === "ar" ? "أفكر" : "thinking" })}\n\n`);

    try {
        const aiSettings = await getAiSettings();

        if (!aiSettings.enabled) {
            const msg = language === "ar"
                ? "مساعد الذكاء الاصطناعي معطّل حالياً. يرجى التواصل مع المسؤول."
                : "The AI assistant is currently disabled. Please contact your administrator.";
            res.write(`data: ${JSON.stringify({ content: msg })}\n\n`);
            res.write("data: [DONE]\n\n");
            return res.end();
        }

        const systemPrompt = language === "ar" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;
        const conversation: { role: string; content: string }[] = [
            { role: "system", content: systemPrompt },
            ...messages.slice(-8),
        ];

        let pendingTicket: any = null;
        const MAX_TOOL_CALLS = 4;

        for (let i = 0; i < MAX_TOOL_CALLS; i++) {
            const llmResponse = await callAi(conversation, aiSettings, { temperature: 0.2, maxTokens: 512 });
            const toolCall = parseToolCall(llmResponse);

            if (!toolCall) {
                for (const word of llmResponse.split(/(\s+)/)) {
                    if (word) res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
                }
                if (pendingTicket) res.write(`data: ${JSON.stringify({ ticketAction: pendingTicket })}\n\n`);
                res.write("data: [DONE]\n\n");
                return res.end();
            }

            logger.info(`[ai-assistant] Tool call: ${toolCall.tool}`);
            const toolName = toolCall.tool === "search_kb" ? (language === "ar" ? "حلول" : "solutions")
                : toolCall.tool === "get_specializations" ? (language === "ar" ? "التخصصات" : "specializations")
                : toolCall.tool === "get_problems" ? (language === "ar" ? "المشاكل" : "problems")
                : (language === "ar" ? "بيانات" : "data");
            res.write(`data: ${JSON.stringify({ toolStatus: toolName })}\n\n`);

            const toolResult = await executeTool(toolCall, language);

            try {
                const parsed = JSON.parse(toolResult);
                if (parsed.__pending_ticket__) {
                    pendingTicket = { title: parsed.title, description: parsed.description, specializationId: parsed.specializationId, problemId: parsed.problemId, specializationName: parsed.specializationName, problemName: parsed.problemName };
                    const previewMsg = language === "ar" ? "جهزت معاينة للتذكرة. راجع العنوان والوصف ثم اختر الإرسال أو الحفظ كمسودة." : "I prepared a ticket preview. Review the title and description, then submit it or save it as a draft.";
                    res.write(`data: ${JSON.stringify({ content: previewMsg })}\n\n`);
                    res.write(`data: ${JSON.stringify({ ticketAction: pendingTicket })}\n\n`);
                    res.write("data: [DONE]\n\n");
                    return res.end();
                }
            } catch { /* not JSON */ }

            conversation.push({ role: "assistant", content: llmResponse });
            conversation.push({ role: "user", content: `[Tool result for ${toolCall.tool}]:\n${toolResult}` });
        }

        const finalResponse = await callAi(conversation, aiSettings, { temperature: 0.2, maxTokens: 512 });
        for (const word of finalResponse.split(/(\s+)/)) {
            if (word) res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
        }
        if (pendingTicket) res.write(`data: ${JSON.stringify({ ticketAction: pendingTicket })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error: any) {
        logger.error("[ai-assistant] Chat error:", error?.message || error);
        const isConnectionError = error?.message?.includes("fetch") || error?.message?.includes("ECONNREFUSED") || error?.message?.includes("timeout") || error?.cause?.code === "ECONNREFUSED";
        const fallback = language === "ar"
            ? (isConnectionError
                ? "تعذّر الاتصال بخدمة الذكاء الاصطناعي. تأكد من أن Ollama يعمل أو أن إعدادات الذكاء الاصطناعي صحيحة في لوحة التحكم."
                : "عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. يمكنك إنشاء تذكرة مباشرة من قسم التذاكر.")
            : (isConnectionError
                ? "Could not connect to the AI service. Make sure Ollama is running, or check the AI settings in the admin panel."
                : "Sorry, the AI service is currently unavailable. You can create a ticket directly from the Tickets section.");
        res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
    }
};

// ─── POST /api/v1/ai-assistant/create-ticket ─────────────────────────────────

export const aiCreateTicket = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { title, description, specializationId, problemId, isDraft } = req.body;
    if (!title?.trim() || !description?.trim()) {
        return res.status(400).json({ error: "Title and description are required" });
    }

    try {
        const ticketRepo = PostgresDataSource.getRepository(Ticket);
        const userRepo = PostgresDataSource.getRepository(User);
        const lang = req.body?.language === "ar" ? "ar" : "en";

        // Load full user entity — same as normal ticket creation
        const requesterUser = await userRepo.findOne({ where: { id: user.id } });
        if (!requesterUser) {
            return res.status(401).json({ error: "User not found" });
        }

        const spec = specializationId ? await resolveSpecialization(specializationId, lang) : null;
        const prob = problemId ? await resolveProblem(problemId, lang, spec) : null;
        const resolvedSpec = spec || prob?.specialization || null;

        if (specializationId && !resolvedSpec) return res.status(400).json({ error: "Invalid specialization" });
        if (problemId && !prob) return res.status(400).json({ error: "Invalid problem type" });

        const ticket = ticketRepo.create({
            title: title.trim().substring(0, 100),
            description: description.trim(),
            status: isDraft ? TicketStatus.DRAFT : TicketStatus.OPEN,
            priority: TicketPriority.NA,
            requester: requesterUser,
            specialization: resolvedSpec ? { id: resolvedSpec.id } : null,
            problem: prob ? { id: prob.id } : null,
        });

        const saved = await ticketRepo.save(ticket) as any;
        const savedTicket = Array.isArray(saved) ? saved[0] : saved;

        // Cache invalidation is best-effort — don't let it fail the response
        invalidateTicketAnalyticsCache().catch((e) =>
            logger.warn("[ai-assistant] Cache invalidation failed (non-fatal):", e?.message)
        );

        logger.info(`[ai-assistant] Ticket #${savedTicket.ticket_number} created by requester ${user.id}`);
        return res.status(201).json({ success: true, ticketId: savedTicket.id, ticketNumber: savedTicket.ticket_number, isDraft: !!isDraft });
    } catch (error: any) {
        logger.error("[ai-assistant] Ticket creation error:", {
            message: error?.message,
            code: error?.code,
            detail: error?.detail,
            constraint: error?.constraint,
            userId: user?.id,
            specializationId,
            problemId,
        });
        return res.status(500).json({ error: "Failed to create ticket", detail: error?.message });
    }
};

// ─── POST /api/v1/ai-assistant/generate-text ─────────────────────────────────
// "Generate with AI" button: organizes text, produces EN + AR + summary.

export const aiGenerateText = async (req: Request, res: Response) => {
    const { text, fieldContext = "" } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "text is required" });

    try {
        const aiSettings = await getAiSettings();
        if (!aiSettings.enabled) return res.status(503).json({ error: "AI assistant is disabled" });

        const prompt = `You are a professional technical writing assistant. The user has written the following text for a support system field (${fieldContext || "general"}).

Your task:
1. Organize and improve the text (fix grammar, structure, clarity) — keep the original meaning
2. Produce an English version (en)
3. Produce an Arabic version (ar) — translate accurately, use formal Arabic
4. Write a short summary (1-2 sentences, in English)

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "en": "<organized English text>",
  "ar": "<organized Arabic text>",
  "summary": "<short English summary>"
}

Original text:
"""
${text.trim()}
"""`;

        const rawContent = await callAi(
            [{ role: "user", content: prompt }],
            aiSettings,
            { temperature: 0.3, maxTokens: 1024 }
        );

        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return valid JSON");

        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.en || !parsed.ar) throw new Error("AI response missing required fields");

        return res.json({ en: parsed.en.trim(), ar: parsed.ar.trim(), summary: parsed.summary?.trim() || "" });

    } catch (error: any) {
        logger.error("[ai-assistant] Generate text error:", error);
        return res.status(500).json({ error: "Failed to generate text" });
    }
};

// ─── GET /api/v1/ai-assistant/health ─────────────────────────────────────────

export const aiAssistantHealth = async (_req: Request, res: Response) => {
    try {
        const aiSettings = await getAiSettings();
        if (!aiSettings.enabled) return res.json({ available: false, reason: "disabled" });

        const health = await checkAiHealth(aiSettings);
        return res.json({
            ...health,
            currentModel: aiSettings.modelName,
            provider: isRemoteProvider(aiSettings) ? "remote" : "ollama",
            chatUrl: isRemoteProvider(aiSettings) ? aiSettings.chatUrl : aiSettings.chatUrl,
        });
    } catch (err: any) {
        return res.json({ available: false, reason: err?.message || "unknown error" });
    }
};

// ─── Warm up the model on startup ────────────────────────────────────────────

export async function warmUpOllamaModel(): Promise<void> {
    try {
        const aiSettings = await getAiSettings();
        if (!aiSettings.enabled) {
            logger.info("[ai-assistant] Warm-up skipped: AI assistant is disabled");
            return;
        }

        logger.info(`[ai-assistant] Warming up model: ${aiSettings.modelName} (${isRemoteProvider(aiSettings) ? "remote" : "ollama"})`);

        await callAi(
            [{ role: "user", content: "hi" }],
            aiSettings,
            { temperature: 0, maxTokens: 1 }
        );

        logger.info(`[ai-assistant] Model ${aiSettings.modelName} warmed up successfully`);
    } catch (err: any) {
        logger.warn(`[ai-assistant] Model warm-up skipped: ${err.message}`);
    }
}
