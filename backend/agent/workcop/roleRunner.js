import { geminiClient } from "../../clients/geminiClient.js";
import { toolDeclarations, FILE_DISCOVERY_INSTRUCTIONS, FILE_OPERATION_INSTRUCTIONS } from "../tools/toolDeclarations.js";
import { executeFunction } from "../sandbox/executeFunction.js";
import { createDiscoveryGuard } from "./discoveryGuard.js";

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
    const guard = createDiscoveryGuard({ container, allowedTools, toolExecutor, repositoryInventory: input?.repositoryInventory });
    const prompt = () => `${systemPrompt}\n\n${FILE_DISCOVERY_INSTRUCTIONS}${allowedTools.includes("ApplyPatch") ? `\n\n${FILE_OPERATION_INSTRUCTIONS}` : ""}${guard.disabled
        ? `\n${guard.disabledReason} Do not call getFileNameList or SearchFile.` : ""}`;
    const toolConfig = () => {
        const tools = toolDeclarations.filter((tool) => guard.availableTools.includes(tool.name));
        return tools.length ? { tools, generation_config: { tool_choice: "validated" } }
            : { generation_config: { tool_choice: "none" } };
    };
    let formatRetryUsed = false;
    const signal = AbortSignal.timeout(ROLE_TIMEOUT_MS);
    if (guard.disabled) await onProgress(`${name}: Using the complete repository inventory; filename discovery is disabled.`);
    let interaction = await createInteraction({
        model: MODEL,
        system_instruction: prompt(),
        input: JSON.stringify(input),
        ...toolConfig()
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
                    system_instruction: prompt(),
                    input: `Your last response did not match the required JSON shape: ${error.message}. Return only corrected JSON.`,
                    ...toolConfig(),
                    generation_config: { tool_choice: "none" }
                }, client, signal);
                continue;
            }
        }
        const results = [];
        for (const call of calls) {
            const discovery = call.name === "getFileNameList" || call.name === "SearchFile";
            const detail = discovery || call.name === "ReadFile" ? ` ${JSON.stringify(call.arguments ?? {}).slice(0, 500)}`
                : call.name === "ApplyPatch" && Array.isArray(call.arguments?.operations)
                    ? ` ${JSON.stringify(call.arguments.operations.map((operation) => ({ type: operation?.type, path: operation?.path }))).slice(0, 500)}` : "";
            await onProgress(`${name}: ${call.name}${detail} started.`);
            const wasDisabled = guard.disabled;
            let response;
            try { response = await guard.execute(call); }
            catch (error) {
                await onProgress(`${name}: ${call.name} failed${error.code ? ` [${error.code}]` : ""}: ${error.message}`);
                throw error;
            }
            const counts = response.value?.totalMatches !== undefined
                ? ` (${response.value.returnedCount}/${response.value.totalMatches} files; nextOffset=${response.value.nextOffset})` : "";
            await onProgress(`${name}: ${call.name} ${response.isError ? `failed${response.value.code ? ` [${response.value.code}]` : ""}: ${response.value.error}` : "finished."}${counts}${response.cached ? " Reused cached result." : ""}`);
            if (!wasDisabled && guard.disabled) await onProgress(`${name}: File discovery disabled after repeated calls or the discovery budget; continuing with other tools.`);
            results.push({
                type: "function_result",
                name: call.name,
                call_id: call.id,
                ...(response.isError ? { is_error: true } : {}),
                result: [{ type: "text", text: JSON.stringify(response.value) }]
            });
        }
        interaction = await createInteraction({
            model: MODEL,
            previous_interaction_id: interaction.id,
            system_instruction: prompt(),
            input: results,
            ...toolConfig()
        }, client, signal);
    }
    throw new Error(`${name} exceeded ${MAX_STEPS} tool rounds.`);
}
