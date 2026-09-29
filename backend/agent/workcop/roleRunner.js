import { geminiClient } from "../../clients/geminiClient.js";
import { toolDeclarations } from "../tools/toolDeclarations.js";
import { executeFunction } from "../sandbox/executeFunction.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const MAX_STEPS = 30;

function parseResponse(text, schema) {
    if (!text || typeof text !== "string") throw new Error("Agent returned no final response.");
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
        return schema.parse(JSON.parse(cleaned));
    } catch (error) {
        throw new Error(`Agent returned invalid structured output: ${error.message}`);
    }
}

async function createInteraction(params, client) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            return await client.interactions.create(params);
        } catch (error) {
            const code = error?.error?.error?.code ?? error?.cause?.error?.code;
            if (code !== "malformed_tool_call" || attempt === 1) throw error;
        }
    }
}

export async function runRole({ name, systemPrompt, input, allowedTools, outputSchema, container,
    client = geminiClient, toolExecutor = executeFunction }) {
    const tools = toolDeclarations.filter((tool) => allowedTools.includes(tool.name));
    let formatRetryUsed = false;
    let interaction = await createInteraction({
        model: MODEL,
        system_instruction: systemPrompt,
        input: JSON.stringify(input),
        ...(tools.length ? { tools } : {})
    }, client);

    for (let step = 0; step < MAX_STEPS; step++) {
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
                }, client);
                continue;
            }
        }
        const results = [];
        for (const call of calls) {
            try {
                const result = await toolExecutor(call, container, allowedTools);
                results.push({
                    type: "function_result",
                    name: call.name,
                    call_id: call.id,
                    result: JSON.stringify(result)
                });
            } catch (error) {
                results.push({
                    type: "function_result",
                    name: call.name,
                    call_id: call.id,
                    is_error: true,
                    result: JSON.stringify({ error: error.message })
                });
            }
        }
        interaction = await createInteraction({
            model: MODEL,
            previous_interaction_id: interaction.id,
            system_instruction: systemPrompt,
            input: results,
            ...(tools.length ? { tools } : {})
        }, client);
    }
    throw new Error(`${name} exceeded ${MAX_STEPS} tool rounds.`);
}
