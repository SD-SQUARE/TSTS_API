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
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

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

    // OpenRouter may return 200 OK but with an error object
    if (data?.error) {
        throw new Error(`AI Provider Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    // OpenAI format: data.choices[0].message.content
    // Ollama format: data.message.content
    const content = data?.choices?.[0]?.message?.content || data?.message?.content;
    if (content == null) {
        // Catch cases where the model natively called a function and returned no content
        if (data?.choices?.[0]?.message?.tool_calls?.length > 0) {
            throw new Error(`Model attempted to use native tool calls instead of JSON format.`);
        }
        return "";
    }
    
    return content;
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

const SYSTEM_PROMPT_EN = `You are an AI support ticket assistant.

You have access to the following tools:
{"tool":"get_specializations"}
{"tool":"get_problems","specializationId":"<id>"}
{"tool":"search_kb","query":"<query>"}
{"tool":"create_ticket","title":"<title>","description":"<description>","specializationId":"<id>","problemId":"<id>"}

CRITICAL RULES:
1. NEVER output XML.
2. NEVER output tags such as:
   * <longcat_tool_call>
   * <tool_call>
   * <function_call>
   * any custom markup
3. Tool calls MUST be returned as a SINGLE JSON object and NOTHING ELSE.

VALID:
{"tool":"get_specializations"}

VALID:
{"tool":"get_problems","specializationId":"085158a4-f6c8-4c49-810d-4491ff2db3af"}

INVALID:
دعني أبحث عن التخصصات
{"tool":"get_specializations"}

INVALID:
<longcat_tool_call>get_specializations</longcat_tool_call>

4. Execute ONLY ONE tool per response.
5. Work like a helpdesk analyst:
   * Do NOT rush to create a ticket.
   * Determine whether enough information exists.
   * Prefer using 'search_kb' to see if the issue can be resolved via knowledge base first.
   * If details are missing, ask exactly ONE concise clarifying question to the user.
6. Never guess 'specializationId' or 'problemId'. You MUST use 'get_specializations' and 'get_problems' to obtain the exact IDs before creating a ticket.
7. Only call 'create_ticket' when you are 90%+ confident you have the user's full problem context, the correct specialization ID, and problem ID.
8. If the user message is generic (e.g., "I can't login", "The portal doesn't work", "There is an error"):
   * Do NOT create a ticket.
   * Ask exactly one diagnostic question to identify the specific system or issue.
9. When creating a ticket:
    {"tool":"create_ticket","title":"...","description":"...","specializationId":"...","problemId":"..."}
9. When outputting a tool call:
   * Output ONLY the JSON object.
   * No explanation.
   * No markdown.
   * No code fences.
   * No extra text.

Failure to follow these rules is an error. Respond in English.`;

const SYSTEM_PROMPT_AR = `أنت مساعد ذكاء اصطناعي لتذاكر الدعم الفني.

لديك وصول إلى الأدوات التالية:
{"tool":"get_specializations"}
{"tool":"get_problems","specializationId":"<id>"}
{"tool":"search_kb","query":"<query>"}
{"tool":"create_ticket","title":"<title>","description":"<description>","specializationId":"<id>","problemId":"<id>"}

قواعد حاسمة:
1. لا تقم أبداً بإخراج XML.
2. لا تقم أبداً بإخراج علامات مثل:
   * <longcat_tool_call>
   * <tool_call>
   * <function_call>
   * أو أي علامات مخصصة
3. يجب إرجاع استدعاءات الأدوات ككائن JSON واحد فقط لا غير.

صحيح:
{"tool":"get_specializations"}

صحيح:
{"tool":"get_problems","specializationId":"085158a4-f6c8-4c49-810d-4491ff2db3af"}

غير صحيح:
دعني أبحث عن التخصصات
{"tool":"get_specializations"}

غير صحيح:
<longcat_tool_call>get_specializations</longcat_tool_call>

4. قم بتنفيذ أداة واحدة فقط لكل رد.
5. اعمل كمحلل دعم فني (Helpdesk Analyst):
   * لا تتسرع في إنشاء تذكرة.
   * حدد ما إذا كانت المعلومات الكافية متوفرة.
   * يُفضل استخدام 'search_kb' لمعرفة ما إذا كان يمكن حل المشكلة عبر قاعدة المعرفة أولاً.
   * إذا كانت التفاصيل ناقصة، اسأل سؤالاً توضيحياً واحداً فقط وبإيجاز.
6. لا تقم أبداً بتخمين 'specializationId' أو 'problemId'. يجب عليك استخدام 'get_specializations' و 'get_problems' للحصول على المعرفات الدقيقة قبل إنشاء تذكرة.
7. لا تستدعِ 'create_ticket' إلا عندما تكون واثقاً بنسبة 90% أو أكثر من أن لديك السياق الكامل لمشكلة المستخدم، ومعرف التخصص الصحيح، ومعرف المشكلة.
8. إذا كانت رسالة المستخدم عامة (مثل: "لا أستطيع تسجيل الدخول"، "البوابة لا تعمل"، "يوجد خطأ"):
   * لا تقم بإنشاء تذكرة.
   * اسأل سؤالاً تشخيصياً واحداً فقط لتحديد النظام أو المشكلة بدقة.
9. عند إنشاء تذكرة:
    {"tool":"create_ticket","title":"...","description":"...","specializationId":"...","problemId":"..."}
9. عند إخراج استدعاء أداة:
   * أخرج كائن JSON فقط.
   * بدون أي شرح.
   * بدون علامات markdown.
   * بدون أكواد نصية (code fences).
   * بدون أي نص إضافي.

الفشل في اتباع هذه القواعد يعتبر خطأ. أجب باللغة العربية حصراً.`;

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

            // Strict specialization check: No guessing allowed
            if (!spec) {
                return lang === "ar" 
                    ? "خطأ: المعرف (ID) الخاص بالتخصص مفقود أو غير صحيح. لا تخمن المعرف. استدعِ get_specializations أولاً للحصول على قائمة التخصصات الصحيحة." 
                    : "Error: Missing or invalid specialization ID. Do not guess. Call get_specializations first to get the correct list of specializations.";
            }

            let prob = cleanProbLookup ? await resolveProblem(cleanProbLookup, lang, spec) : null;

            // Strict problem check: No guessing allowed
            if (!prob) {
                return lang === "ar" 
                    ? "خطأ: المعرف (ID) الخاص بالمشكلة مفقود أو غير صحيح أو لا ينتمي للتخصص المختار. لا تخمن المعرف. استدعِ get_problems أولاً للحصول على قائمة المشاكل." 
                    : "Error: Missing or invalid problem ID for this specialization. Do not guess. Call get_problems first to get the correct list of problems.";
            }

            const resolvedSpec = spec;

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

export function parseToolCall(text: string): any | null {
    // 1. Try markdown code blocks first as they are most explicit
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
        try {
            const parsed = JSON.parse(codeBlockMatch[1]);
            if (parsed?.tool) return parsed;
        } catch { /* ignore */ }
    }

    // 2. Try raw JSON extraction with balanced braces (more robust than original regex)
    const extractJson = (str: string): any | null => {
        let depth = 0;
        let start = -1;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (escapeNext) { escapeNext = false; continue; }
            if (c === '\\') { escapeNext = true; continue; }
            if (c === '"') { inString = !inString; continue; }
            
            if (!inString) {
                if (c === '{') {
                    if (depth === 0) start = i;
                    depth++;
                } else if (c === '}') {
                    depth--;
                    if (depth === 0 && start !== -1) {
                        try {
                            // Basic repair for trailing commas common in LLM outputs
                            let jsonStr = str.substring(start, i + 1);
                            jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
                            const parsed = JSON.parse(jsonStr);
                            if (parsed?.tool) return parsed;
                        } catch { /* ignore */ }
                        start = -1;
                    }
                }
            }
        }
        return null;
    };
    
    const rawParsed = extractJson(text);
    if (rawParsed) return rawParsed;

    // 3. Fallback: handle XML-style tool calls
    const xmlTagMatch = text.match(/<(?:tool_call|longcat_tool_call|function_call|invoke)[^>]*>([\s\S]*?)(?:<\/(?:tool_call|longcat_tool_call|function_call|invoke)>|$)/i);
    if (xmlTagMatch) {
        const inner = xmlTagMatch[1].trim();
        try {
            const parsed = JSON.parse(inner);
            if (parsed?.tool) return parsed;
        } catch { /* not JSON */ }

        // Sometimes the model outputs: <longcat_tool_call>search_kb","query":"..."}
        // Let's strip any leading non-alphanumeric (like quote or comma) from the remainder
        const nameMatch = inner.match(/^"?([A-Za-z0-9_]+)"?\s*[,:]?\s*([\s\S]*)/);
        if (nameMatch) {
            const toolName = nameMatch[1].trim();
            let remainder = nameMatch[2].trim();
            if (remainder.startsWith(',')) remainder = remainder.slice(1).trim();

            const result: any = { tool: toolName };

            if (remainder) {
                try {
                    // Try to fix trailing braces if needed
                    if (!remainder.endsWith("}")) remainder += "}";
                    const args = JSON.parse(remainder.startsWith("{") ? remainder : `{${remainder}`);
                    Object.assign(result, args);
                } catch {
                    // Pattern 1 & 2: <longcat_arg_key>KEY</longcat_arg_key> [<longcat_arg_value>]VAL</longcat_arg_value>
                    const longcatWellFormed = remainder.matchAll(/<longcat_arg_key>([\s\S]*?)<\/longcat_arg_key>\s*(?:<longcat_arg_value>)?([\s\S]*?)<\/longcat_arg_value>/gi);
                    let foundArgs = false;
                    for (const [, key, value] of longcatWellFormed) {
                        result[key.trim()] = value.trim();
                        foundArgs = true;
                    }

                    // Pattern 3: Degenerate — key and value merged inside one tag:
                    // <longcat_arg_key>KEY\nVALUE</longcat_arg_value>  (no closing key tag, no opening value tag)
                    if (!foundArgs) {
                        const longcatMerged = remainder.matchAll(/<longcat_arg_key>([^\n<]+)\n([\s\S]*?)<\/longcat_arg_value>/gi);
                        for (const [, key, value] of longcatMerged) {
                            result[key.trim()] = value.trim();
                            foundArgs = true;
                        }
                    }

                    // Pattern 4: key="value" style
                    if (!foundArgs) {
                        const kvPairs = remainder.matchAll(/(\w+)\s*[:=]\s*"([^"]+)"/g);
                        for (const [, key, value] of kvPairs) {
                            result[key] = value;
                        }
                    }
                }
            }
            if (result.tool) return result;
        }
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

        // Helper: strip embedded file content blocks from messages to reduce context size on retry
        const stripFileContent = (msgs: { role: string; content: string }[]) =>
            msgs.map(m => ({
                ...m,
                content: m.role === "user"
                    ? m.content
                        .replace(/---\s*File:.*?---\n[\s\S]*?(?=\n---\s*File:|$)/g, "")
                        .replace(/\[File:.*?\]/g, "[File attached - content omitted]")
                        .trim()
                    : m.content
            }));

        const conversation: { role: string; content: string }[] = [
            { role: "system", content: systemPrompt },
            ...messages.slice(-8),
        ];

        let pendingTicket: any = null;
        const MAX_TOOL_CALLS = 17;
        const executedTools = new Set<string>();

        for (let i = 0; i < MAX_TOOL_CALLS; i++) {
            // Use deterministic temperature: 0 for tool calling phases
            let llmResponse: string;
            try {
                llmResponse = await callAi(conversation, aiSettings, { temperature: 0, maxTokens: 512 });
            } catch (providerErr: any) {
                // Provider error (e.g. context too large due to file content) — strip file blocks and retry once
                if (providerErr?.message?.includes("Provider returned error") || providerErr?.message?.includes("context length")) {
                    logger.warn({ message: "[ai-assistant] Provider error, retrying without file content", error: providerErr?.message });
                    try {
                        const stripped = stripFileContent(conversation);
                        llmResponse = await callAi(stripped, aiSettings, { temperature: 0, maxTokens: 512 });
                    } catch {
                        throw providerErr; // re-throw original if retry also fails
                    }
                } else {
                    throw providerErr;
                }
            }
            const toolCall = parseToolCall(llmResponse);


            if (!toolCall) {
                // Safeguard: Malformed XML
                if (llmResponse.includes("<longcat_tool_call>") || llmResponse.includes("<tool_call>")) {
                    logger.warn({ message: "[ai-assistant] XML detected, injecting corrective prompt", language });
                    conversation.push({ role: "assistant", content: llmResponse });
                    const correctivePrompt = language === "ar"
                        ? "خطأ حرج: قمت بإخراج تنسيق XML. يجب عليك إخراج كائن JSON فقط ولا شيء غيره."
                        : "CRITICAL ERROR: You output XML format. You MUST output a raw JSON object ONLY.";
                    conversation.push({ role: "user", content: correctivePrompt });
                    continue;
                }

                // Safeguard: Detect if the model described a tool but failed to output JSON
                const descMatch = llmResponse.match(/(create_ticket|get_problems|get_specializations|search_kb)/i);
                if (descMatch && i < MAX_TOOL_CALLS - 1) {
                    logger.warn({
                        message: "[ai-assistant] Tool description without JSON detected, applying recovery prompt",
                        language,
                        model: aiSettings.modelName,
                        rawResponse: llmResponse,
                        detectedTool: descMatch[1]
                    });
                    
                    conversation.push({ role: "assistant", content: llmResponse });
                    const correctivePrompt = language === "ar" 
                        ? `لقد ذكرت أداة (${descMatch[1]}) ولكنك لم تقم بإخراج كائن JSON الصحيح. من فضلك أخرج كائن JSON فقط للقيام بالعملية، دون كتابة أي نص آخر.`
                        : `You described a tool (${descMatch[1]}) but did not output the required JSON format. Please output ONLY the JSON object to execute the tool.`;
                    conversation.push({ role: "user", content: correctivePrompt });
                    continue;
                }

                // Normal exit logic
                for (const word of llmResponse.split(/(\s+)/)) {
                    if (word) res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
                }
                if (pendingTicket) res.write(`data: ${JSON.stringify({ ticketAction: pendingTicket })}\n\n`);
                res.write("data: [DONE]\n\n");
                return res.end();
            }

            // Only block create_ticket from repeating (to prevent duplicate tickets).
            // get_specializations, get_problems and search_kb are allowed to retry
            // because their first call might fail with missing/invalid args.
            if (executedTools.has(toolCall.tool) && toolCall.tool === "create_ticket") {
                logger.warn({ message: "[ai-assistant] Prevented duplicate create_ticket", tool: toolCall.tool });
                conversation.push({ role: "assistant", content: llmResponse });
                const loopPrompt = language === "ar"
                    ? "لقد قمت بإنشاء التذكرة مسبقاً. لا تكرر العملية. اقرأ سجل المحادثة وأجب المستخدم."
                    : "The ticket was already prepared. Do not call create_ticket again. Summarize the result to the user.";
                conversation.push({ role: "user", content: loopPrompt });
                continue;
            }

            // Structured logging
            logger.info({
                message: `[ai-assistant] Executing tool: ${toolCall.tool}`,
                language,
                model: aiSettings.modelName,
                rawResponse: llmResponse,
                parsedTool: toolCall
            });
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
            // Track create_ticket execution to prevent duplicates
            if (toolCall.tool === "create_ticket") executedTools.add("create_ticket");
        }

        let finalResponse = await callAi(conversation, aiSettings, { temperature: 0.2, maxTokens: 512 });

        // If the model still emits a tool call in the final response, try to execute it (especially create_ticket)
        const finalToolCall = parseToolCall(finalResponse);
        if (finalToolCall?.tool === "create_ticket") {
            const toolResult = await executeTool(finalToolCall, language);
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
            } catch { /* fall through */ }
        }

        // Final safeguard against leaking raw XML tool calls
        if (finalResponse.includes("<longcat_tool_call>") || finalResponse.includes("<tool_call>") || finalResponse.includes('{"tool":') || finalToolCall) {
            // The model is stuck — ask it one more time to produce a plain text summary
            try {
                const nudge = language === "ar"
                    ? "استناداً إلى نتائج الأدوات أعلاه، قدم ملخصاً نصياً مختصراً للمستخدم دون استخدام أي JSON أو XML."
                    : "Based on the tool results above, provide a short plain-text summary response to the user. Do NOT output any JSON or XML.";
                conversation.push({ role: "assistant", content: finalResponse });
                conversation.push({ role: "user", content: nudge });
                finalResponse = await callAi(conversation, aiSettings, { temperature: 0.4, maxTokens: 400 });
                // Strip any remaining XML
                if (finalResponse.includes("<longcat_tool_call>") || finalResponse.includes("<tool_call>") || finalResponse.includes('{"tool":')) {
                    finalResponse = language === "ar"
                        ? "تم جمع المعلومات. يمكنني المساعدة في تقديم طلب دعم. هل تريد إنشاء تذكرة؟"
                        : "I've gathered the information needed. I can help you submit a support request. Would you like me to create a ticket?";
                }
            } catch {
                finalResponse = language === "ar"
                    ? "تم جمع المعلومات. يمكنني المساعدة في تقديم طلب دعم. هل تريد إنشاء تذكرة؟"
                    : "I've gathered the information needed. I can help you submit a support request. Would you like me to create a ticket?";
            }
        }

        for (const word of finalResponse.split(/(\s+)/)) {
            if (word) res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
        }
        if (pendingTicket) res.write(`data: ${JSON.stringify({ ticketAction: pendingTicket })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error: any) {
        logger.error({
            message: "[ai-assistant] Chat error during execution",
            errorMsg: error?.message || String(error),
            stack: error?.stack,
            cause: error?.cause,
            language,
            conversationState: req.body.messages?.map((c: any) => ({ role: c.role, length: c.content?.length, preview: c.content?.substring(0, 100) }))
        });
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

        audit(req)
            .action(AuditAction.CREATE_TICKET)
            .summary(`Created ticket #${savedTicket.ticket_number} via AI Assistant`);

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

        audit(req)
            .action(AuditAction.GENERATE_AI_TEXT)
            .summary(`Generated AI text for field: ${fieldContext || "general"}`);

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
