import { z } from "zod";
import { prisma } from "../clients/prismaClient.js";
import { runRole } from "../agent/workcop/roleRunner.js";
import { getConversationContainer } from "./conversationContainer.js";
import { conversationContext } from "./conversationContext.js";

const answerSchema = z.object({ answer: z.string().min(1) });

export async function processChat(job, { db = prisma, getContainer = getConversationContainer, role = runRole } = {}) {
    const { conversationId, repositoryId, userId, assistantMessageId, query } = job.data;
    try {
        const { container } = await getContainer({ conversationId, repositoryId, userId, db });
        const history = await conversationContext(conversationId, db);
        const response = await role({
            name: "Repository chat",
            container,
            allowedTools: ["getFileNameList", "SearchFile", "SearchContent", "ReadFile", "GitDiff"],
            outputSchema: answerSchema,
            systemPrompt: `You are a coding assistant in an ongoing repository conversation.
Answer the user's latest message directly. Read repository files when needed and ground code-specific claims in what you inspect.
You can inspect the working tree and current diff. You cannot edit files or start code work in chat mode.
If the user requests a code change, discuss the approach and tell them to switch to Agent mode to run it.
Return only JSON with one field: answer.`,
            input: { repositoryRoot: "/workspace/repository", history, latestMessage: query }
        });
        await db.$transaction([
            db.message.update({ where: { id: assistantMessageId }, data: { content: response.answer, status: "completed" } }),
            db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
        ]);
        return response;
    } catch (error) {
        await db.message.update({ where: { id: assistantMessageId }, data: { content: `I couldn't answer this message: ${error.message}`, status: "failed" } });
        throw error;
    }
}
