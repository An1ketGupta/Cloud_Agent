import { dockerClient } from "../../clients/dockerClient.js";
import { geminiClient } from "../../clients/geminiClient.js";
import { SYSTEM_PROMPT_NEW_CHAT } from "../../public/prompt.js";
import { cloneRepository } from "../github/cloneRepository.js";
import { executeFunction } from "./executeFunction.js";

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

        if(githubRepoCloneResponse.complete != true){
            console.log(githubRepoCloneResponse.message)
            throw new Error("Unable to clone the repository.");
        }

        else{
            console.log("Cloned the repository.")

            let input =
                SYSTEM_PROMPT_NEW_CHAT +
                "\n\nUSER REQUEST:\n" +
                query;
    
            while (true) {
                const interaction = await geminiClient.interactions.create({
                    model: "gemini-3.1-flash-lite",
                    input,
                });
    
                const output = interaction.output_text;
                if (!output) {
                    throw new Error("Gemini returned an empty response");
                }
    
                console.log("Agent output:", output);
    
                if (output.startsWith("FUNCTION_CALL:")) {
                    const response = await executeFunction(
                        output,
                        container
                    );
                    const serializedResponse = JSON.stringify(
                        response,
                        null,
                        2
                    );

                    if (serializedResponse === undefined) {
                        throw new Error(
                            "Function returned an unserializable result"
                        );
                    }

                    input +=
                        "\n\nFUNCTION_RESULT:\n\n" +
                        serializedResponse;
                } else {
                    console.log("Agent completed task:", taskId);
                    break;
                }
            }
            return {
                success: true,
                taskId,
            };
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
