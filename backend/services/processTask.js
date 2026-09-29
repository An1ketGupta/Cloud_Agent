import createAgentContainer from "./createAgentContainer.js";
import { cloneRepository } from "../agent/github/cloneRepository.js";
import { runWorkCop } from "../agent/workcop/workCop.js";
import { GitDiff } from "../agent/tools/gitDiff.js";
import { prisma } from "../clients/prismaClient.js";
import { logTask } from "./taskLogger.js";

export async function processTask(job, {
    db = prisma,
    createContainer = createAgentContainer,
    clone = cloneRepository,
    runAgents = runWorkCop,
    readDiff = GitDiff
} = {}) {
    const { taskId, queryId, repositoryId, userId, query } = job.data;
    let container;
    let cloned = false;
    let resultPersisted = false;
    let keepContainer = false;

    async function progress(message) {
        logTask(taskId, message);
        await job.updateProgress(message).catch((error) => {
            logTask(taskId, `Could not publish progress: ${error.message}`);
        });
    }

    try {
        await progress("Worker picked up the task.");
        await db.task.update({ where: { id: taskId }, data: { status: "runnning" } });

        if (runAgents === runWorkCop && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
            throw new Error("Set GEMINI_API_KEY in backend/.env before submitting agent tasks.");
        }

        await progress("Starting the Node.js container.");
        container = await createContainer();
        await progress(`Container started: ${container.id}`);
        await progress("Cloning the selected repository into /workspace/repository.");
        const repository = await clone(container, repositoryId, userId);
        cloned = true;
        await progress(`Clone verified for ${repository.repository}.`);

        const result = await runAgents({ container, request: query.trim(), onProgress: progress });
        const approved = result.approved === true;
        const response = {
            success: approved,
            taskId,
            repository: repository.repository,
            repositoryRoot: repository.root,
            ...(approved ? { containerId: container.id } : {}),
            ...result
        };

        await db.$transaction([
            db.query.update({ where: { id: queryId }, data: { response: JSON.stringify(response) } }),
            db.task.update({ where: { id: taskId }, data: { status: approved ? "completed" : "failed" } })
        ]);
        resultPersisted = true;
        keepContainer = approved;

        if (!approved) {
            throw new Error(result.summary || "QA did not approve the changes.");
        }

        await progress("QA approved the patch. Task completed; container remains running.");
        return response;
    } catch (error) {
        logTask(taskId, `Task failed: ${error.message}`);
        if (!resultPersisted) {
            let patch = null;
            if (cloned) {
                try { patch = (await readDiff(container)).patch; } catch {}
            }
            await db.$transaction([
                db.query.update({
                    where: { id: queryId },
                    data: { response: JSON.stringify({ success: false, error: error.message, patch }) }
                }),
                db.task.update({ where: { id: taskId }, data: { status: "failed" } })
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
