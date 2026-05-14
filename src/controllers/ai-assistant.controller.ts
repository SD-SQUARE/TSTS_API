import { Request, Response } from "express";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { KnowledgeItem } from "../entities/KnowledgeItem.js";
import { Ticket } from "../entities/Ticket.js";
import { Specialization } from "../entities/Specialization.js";
import { Problem } from "../entities/problem.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { TicketPriority } from "../enums/TicketPriority.enum.js";
import logger from "../utils/logger.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const OLLAMA_TIMEOUT_MS = 10 * 60 * 1000;

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
  → Create a support ticket (use when user confirms)

Rules:
- Call ONE tool at a time
- After getting tool results, continue helping the user
- Only call create_ticket when you have title, description, specializationId, problemId AND user confirmed
- Respond in the user's language (Arabic or English)
`;

const SYSTEM_PROMPT_EN = `You are a helpful technical support assistant. Help users solve problems or create support tickets.
${TOOLS_DESCRIPTION}`;

const SYSTEM_PROMPT_AR = `أنت مساعد دعم تقني مفيد. ساعد المستخدمين في حل مشاكلهم أو إنشاء تذاكر دعم.
${TOOLS_DESCRIPTION}`;

// ─── Tool Executors ──────────────────────────────────────────────────────────

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
                if (toolCall.specializationId) {
                    where.specialization = { id: toolCall.specializationId };
                }
                const problems = await repo.find({ where, relations: ["specialization"] });
                if (problems.length === 0) return "No problems found for this specialization.";
                return problems.map(p => {
                    const name = p.name[lang as "en" | "ar"] || p.name.en || p.name.ar || "Unknown";
                    return `- ${name} (id: ${p.id})`;
                }).join("\n");
            } catch {
                return "Failed to get problems.";
            }
        }

        case "create_ticket": {
            // Return a special marker - actual creation happens after LLM confirms
            return JSON.stringify({
                __pending_ticket__: true,
                title: toolCall.title,
                description: toolCall.description,
                specializationId: toolCall.specializationId,
                problemId: toolCall.problemId,
            });
        }

        default:
            return `Unknown tool: ${toolCall.tool}`;
    }
}

// ─── Parse tool call from LLM output ─────────────────────────────────────────

function parseToolCall(text: string): any | null {
    // Look for a JSON object that has a "tool" key
    const match = text.match(/\{[^{}]*"tool"\s*:\s*"[^"]+[^{}]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
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
                num_predict: 512,
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
                    };
                    // Add to conversation as if tool returned success
                    conversation.push({ role: "assistant", content: llmResponse });
                    conversation.push({
                        role: "user",
                        content: `[Tool result for ${toolCall.tool}]: Ticket data collected. Now confirm with the user and present a summary.`,
                    });
                    continue;
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

    const { title, description, specializationId, problemId } = req.body;
    if (!title?.trim() || !description?.trim()) {
        return res.status(400).json({ error: "Title and description are required" });
    }

    try {
        const ticketRepo = PostgresDataSource.getRepository(Ticket);

        const ticketData: any = {
            title: title.trim().substring(0, 100),
            description: description.trim(),
            status: TicketStatus.OPEN,
            priority: TicketPriority.NA,
            requester: { id: user.id },
        };

        if (specializationId) ticketData.specialization = { id: specializationId };
        if (problemId) ticketData.problem = { id: problemId };

        const ticket = ticketRepo.create(ticketData);
        const saved = await ticketRepo.save(ticket) as any;
        const savedTicket = Array.isArray(saved) ? saved[0] : saved;

        logger.info(`[ai-assistant] Ticket #${savedTicket.ticket_number} created by requester ${user.id}`);

        return res.status(201).json({
            success: true,
            ticketId: savedTicket.id,
            ticketNumber: savedTicket.ticket_number,
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
