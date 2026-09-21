import { dockerClient } from "../../clients/dockerClient.js";
import { geminiClient } from "../../clients/geminiClient.js";
import { SYSTEM_PROMPT_NEW_CHAT } from "../../public/prompt.js";
import { cloneRepository } from "../github/cloneRepository.js";
import { toolDeclarations } from "../tools/toolDeclarations.js";
import { executeFunction } from "./executeFunction.js";

const MAX_AGENT_STEP = 50;
const MAX_FAIL_ATTEMPT = 2;

function isMalformedToolCall(error) {
    if(error?.error?.error?.code === "malformed_tool_call" || error?.cause?.error?.code === "malformed_tool_call")
        return true;    
}

async function createInteraction(params) {
    for (let attempt = 1;attempt <= MAX_FAIL_ATTEMPT;attempt++) {
        try {
            return await geminiClient.interactions.create(params);
        } catch (error) {
            if (
                !isMalformedToolCall(error) ||
                attempt === 1
            ) {
                throw error;
            }
            console.log(
                `Gemini generated a malformed tool call.`
            );
        }
    }
}

export async function runAgentTask(data) {
    let container;

    try {
        const { taskId, conversation, repoName, userId } = data;
        if (!taskId) {
            throw new Error("Task ID is required");
        }

        if (!conversation || conversation.length === 0) {
            throw new Error("Conversation is required");
        }
        const query = conversation[0].query;

        if (!query) {
            throw new Error("User query is required");
        }

        container = await dockerClient.createContainer({
            Image: "cloud-agent",
            WorkingDir: "/workspace",
            Cmd: ["tail", "-f", "/dev/null"],
        });

        await container.start();

        const githubRepoCloneResponse = await cloneRepository(container, repoName, userId)

        if(!githubRepoCloneResponse.complete){
            console.log(githubRepoCloneResponse.message)
            throw new Error("Unable to clone the repository.");
        }

        else{
            console.log("Cloned the repository.")

            let interaction = await createInteraction({
                model: "gemini-3.1-flash-lite",
                system_instruction: SYSTEM_PROMPT_NEW_CHAT,
                input: query,
                tools: toolDeclarations
            });

            for (let step = 0; step < MAX_AGENT_STEP; step++) {
                const functionCalls = (interaction.steps ?? []).filter(
                    interactionStep =>
                        interactionStep.type === "function_call"
                );

                if (functionCalls.length === 0) {
                    if (!interaction.output_text) {
                        throw new Error(
                            "Gemini returned neither a function call nor a final response"
                        );
                    }

                    console.log("Agent output:", interaction.output_text);
                    console.log("Agent completed task:", taskId);

                    return {
                        success: true,
                        taskId,
                        response: interaction.output_text
                    };
                }

                const functionResults = [];

                for (const functionCall of functionCalls) {
                    console.log(
                        "Agent function call:",
                        functionCall.name,
                        functionCall.arguments
                    );

                    try {
                        const response = await executeFunction(
                            functionCall,
                            container
                        );

                        functionResults.push({
                            type: "function_result",
                            name: functionCall.name,
                            call_id: functionCall.id,
                            result: JSON.stringify(response ?? null)
                        });
                    } catch (error) {
                        functionResults.push({
                            type: "function_result",
                            name: functionCall.name,
                            call_id: functionCall.id,
                            is_error: true,
                            result: JSON.stringify({
                                error: error.message
                            })
                        });
                    }
                }

                interaction = await createInteraction({
                    model: "gemini-3.1-flash-lite",
                    previous_interaction_id: interaction.id,
                    system_instruction: SYSTEM_PROMPT_NEW_CHAT,
                    input: functionResults,
                    tools: toolDeclarations
                });
            }

            throw new Error(
                `Agent exceeded the maximum of 10 steps`
            );
        }
        
    } catch (error) {
        console.log("Agent task failed:", error);
        throw error;

    } finally {
        if (container) {
            try {
                await container.remove({
                    force: true,
                });
                console.log("Container removed");
            } catch (cleanupError) {
                console.error(
                    "Failed to remove container:",
                    cleanupError
                );
            }
        }
    }
}
