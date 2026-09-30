import { geminiClient } from "../../clients/geminiClient.js";
import { toolDeclarations } from "../tools/toolDeclarations.js";
import { executeFunction } from "../sandbox/executeFunction.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const MAX_STEPS = 60;
const ROLE_TIMEOUT_MS = 4 * 60_000;

function parseResponse(text, schema) {
    if (!text || typeof text !== "string") throw new Error("Agent returned no final response.");
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
        return schema.parse(JSON.parse(cleaned));
    } catch (error) {
        throw new Error(`Agent returned invalid structured output: ${error.message}`);
    }
}

async function createInteraction(params, client, signal) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            return await client.interactions.create(params, { signal, timeout_ms: 90_000 });
        } catch (error) {
            const code = error?.error?.error?.code ?? error?.cause?.error?.code;
            if (code !== "malformed_tool_call" || attempt === 1) throw error;
        }
    }
}

export async function runRole({ name, systemPrompt, input, allowedTools, outputSchema, container,
    client = geminiClient, toolExecutor = executeFunction, onProgress = async () => {} }) {
    const tools = toolDeclarations.filter((tool) => allowedTools.includes(tool.name));
    let formatRetryUsed = false;
    const signal = AbortSignal.timeout(ROLE_TIMEOUT_MS);
    let interaction = await createInteraction({
        model: MODEL,
        system_instruction: systemPrompt,
        input: JSON.stringify(input),
        ...(tools.length ? { tools } : {})
    }, client, signal);

    for (let step = 0; step < MAX_STEPS; step++) {
        if (signal.aborted) throw new Error(`${name} timed out after four minutes.`);
        const calls = (interaction.steps ?? []).filter((item) => item.type === "function_call");
        if (calls.length === 0) {
            try {
                return parseResponse(interaction.output_text, outputSchema);
            } catch (error) {
                if (formatRetryUsed) throw error;
                formatRetryUsed = true;
                interaction = await createInteraction({
                    model: MODEL,
                    previous_interaction_id: interaction.id,
                    system_instruction: systemPrompt,
                    input: `Your last response did not match the required JSON shape: ${error.message}. Return only corrected JSON.`,
                    ...(tools.length ? { tools } : {})
                }, client, signal);
                continue;
            }
        }
        const results = [];
        for (const call of calls) {
            await onProgress(`${name}: ${call.name} started.`);
            try {
                const result = await toolExecutor(call, container, allowedTools);
                await onProgress(`${name}: ${call.name} finished.`);
                results.push({
                    type: "function_result",
                    name: call.name,
                    call_id: call.id,
                    result: [{ type: "text", text: JSON.stringify(result) }]
                });
            } catch (error) {
                await onProgress(`${name}: ${call.name} failed: ${error.message}`);
                results.push({
                    type: "function_result",
                    name: call.name,
                    call_id: call.id,
                    result: [{ type: "text", text: JSON.stringify({ error: error.message }) }]
                });
            }
        }
        interaction = await createInteraction({
            model: MODEL,
            previous_interaction_id: interaction.id,
            system_instruction: systemPrompt,
            input: results,
            ...(tools.length ? { tools } : {})
        }, client, signal);
    }
    throw new Error(`${name} exceeded ${MAX_STEPS} tool rounds.`);
}
