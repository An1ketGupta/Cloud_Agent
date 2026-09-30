import createAgentContainer from "./createAgentContainer.js";
import { cloneRepository } from "../agent/github/cloneRepository.js";
import { runWorkCop } from "../agent/workcop/workCop.js";
import { GitDiff } from "../agent/tools/gitDiff.js";
import { prisma } from "../clients/prismaClient.js";
import { logTask } from "./taskLogger.js";
import { getConversationContainer } from "./conversationContainer.js";
import { conversationContext } from "./conversationContext.js";

export async function processTask(job, {
    db = prisma,
    createContainer = createAgentContainer,
    clone = cloneRepository,
    runAgents = runWorkCop,
    readDiff = GitDiff,
    getContainer = getConversationContainer,
    getHistory = conversationContext
} = {}) {
    const { taskId, queryId, repositoryId, userId, query, conversationId, assistantMessageId } = job.data;
    let container;
    let cloned = false;
    let resultPersisted = false;
    let keepContainer = false;
    const agentOutputs = [];

    async function progress(message) {
        logTask(taskId, message);
        try {
            await Promise.all([job.updateProgress(message), job.log?.(message)]);
        } catch (error) {
            logTask(taskId, `Could not publish progress: ${error.message}`);
        }
    }

    async function onAgentResult(agentResult) {
        agentOutputs.push(agentResult);
        await db.query.update({
            where: { id: queryId },
            data: { response: JSON.stringify({ agentOutputs }) }
        });
    }

    try {
        await progress("Worker picked up the task.");
        await db.task.update({ where: { id: taskId }, data: { status: "runnning" } });

        if (runAgents === runWorkCop && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
            throw new Error("Set GEMINI_API_KEY in backend/.env before submitting agent tasks.");
        }

        let repository;
        if (conversationId) {
            await progress("Opening the conversation working tree.");
            ({ container } = await getContainer({ conversationId, repositoryId, userId, db }));
            keepContainer = true;
            repository = { repository: (await db.conversation.findUnique({ where: { id: conversationId }, include: { repository: true } })).repository.fullName, root: "/workspace/repository" };
        } else {
            await progress("Starting the Node.js container.");
            container = await createContainer();
            await progress(`Container started: ${container.id}`);
            await progress("Cloning the selected repository into /workspace/repository.");
            repository = await clone(container, repositoryId, userId);
        }
        cloned = true;
        await progress(`Repository ready: ${repository.repository}.`);

        const request = conversationId ? `Conversation so far:\n${await getHistory(conversationId, db)}\n\nLatest code request: ${query.trim()}` : query.trim();
        const result = await runAgents({ container, request, onProgress: progress, onAgentResult });
        const approved = result.approved === true;
        const response = {
            success: approved,
            taskId,
            repository: repository.repository,
            repositoryRoot: repository.root,
            ...(approved ? { containerId: container.id } : {}),
            ...result,
            agentOutputs
        };

        await db.$transaction([
            db.query.update({ where: { id: queryId }, data: { response: JSON.stringify(response) } }),
            db.task.update({ where: { id: taskId }, data: { status: approved ? "completed" : "failed" } }),
            ...(assistantMessageId ? [db.message.update({ where: { id: assistantMessageId }, data: { content: result.summary || (approved ? "Code changes completed." : "Code changes need revision."), status: approved ? "completed" : "failed" } })] : [])
        ]);
        resultPersisted = true;
        keepContainer = approved || !!conversationId;

        if (!approved) {
            throw new Error(result.summary || "QA did not approve the changes.");
        }

        await progress("QA approved the patch. Task completed; container remains running.");
        return response;
    } catch (error) {
        await progress(`Task failed: ${error.message}`);
        if (!resultPersisted) {
            let patch = null;
            if (cloned) {
                try { patch = (await readDiff(container)).patch; } catch {}
            }
            await db.$transaction([
                db.query.update({
                    where: { id: queryId },
                    data: { response: JSON.stringify({ success: false, error: error.message, patch, agentOutputs }) }
                }),
                db.task.update({ where: { id: taskId }, data: { status: "failed" } }),
                ...(assistantMessageId ? [db.message.update({ where: { id: assistantMessageId }, data: { content: `Code work failed: ${error.message}`, status: "failed" } })] : [])
            ]);
        }
        throw error;
    } finally {
        if (container && !keepContainer) {
            await container.remove({ force: true }).catch((error) => {
                logTask(taskId, `Could not remove container ${container.id}: ${error.message}`);
            });
        }
    }
}
