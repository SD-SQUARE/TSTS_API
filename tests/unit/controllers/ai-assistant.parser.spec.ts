import { parseToolCall } from "../../../src/controllers/ai-assistant.controller";

describe("parseToolCall", () => {
    it("should parse standard JSON tool call", () => {
        const text = `{"tool":"get_specializations"}`;
        const result = parseToolCall(text);
        expect(result).toEqual({ tool: "get_specializations" });
    });

    it("should parse Markdown JSON tool call", () => {
        const text = "Here is the tool call:\n```json\n{\"tool\":\"create_ticket\",\"title\":\"Test\"}\n```";
        const result = parseToolCall(text);
        expect(result).toEqual({ tool: "create_ticket", title: "Test" });
    });

    it("should parse existing XML tool call", () => {
        const text = `<tool_call>create_ticket {"title":"Test"}</tool_call>`;
        const result = parseToolCall(text);
        expect(result).toEqual({ tool: "create_ticket", title: "Test" });
    });

    it("should parse LongCat XML format tool call", () => {
        const text = `<longcat_tool_call>create_ticket
<longcat_arg_key>title</longcat_arg_key>
<longcat_arg_value>عدم القدرة على الدخول إلى بوابة الجامعة - لا يوجد حساب</longcat_arg_value>

<longcat_arg_key>description</longcat_arg_key>
<longcat_arg_value>المستخدم لا يستطيع الدخول إلى بوابة الجامعة لأنه لا يملك حساباً.</longcat_arg_value>

<longcat_arg_key>specializationId</longcat_arg_key>
<longcat_arg_value>085158a4-f6c8-4c49-810d-4491ff2db3af</longcat_arg_value>

<longcat_arg_key>problemId</longcat_arg_key>
<longcat_arg_value>70f43dd5-d33d-4b28-9d4b-5f88d16aa294</longcat_arg_value>
</longcat_tool_call>`;
        const result = parseToolCall(text);
        expect(result).toEqual({
            tool: "create_ticket",
            title: "عدم القدرة على الدخول إلى بوابة الجامعة - لا يوجد حساب",
            description: "المستخدم لا يستطيع الدخول إلى بوابة الجامعة لأنه لا يملك حساباً.",
            specializationId: "085158a4-f6c8-4c49-810d-4491ff2db3af",
            problemId: "70f43dd5-d33d-4b28-9d4b-5f88d16aa294"
        });
    });
});
