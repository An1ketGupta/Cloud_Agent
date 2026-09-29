import "dotenv/config";
import { Worker } from "bullmq";
import { runAgentTask } from "../agent/sandbox/agentHandler.js";
import { prisma } from "../clients/prismaClient.js";

const connection = {
    host: "localhost",
    port: 6379
}

const taskWorker = new Worker("task-queue", 
    async (job) => {
        const { taskId } = job.data;
        await prisma.task.update({ where: { id: taskId }, data: { status: "runnning" } });
        try {
            const response = await runAgentTask(job.data);
            await prisma.$transaction([
                prisma.query.update({
                    where: { id: job.data.queryId },
                    data: { response: JSON.stringify(response) }
                }),
                prisma.task.update({ where: { id: taskId }, data: { status: response.success ? "completed" : "failed" } })
            ]);
            if (!response.success) {
                const error = new Error(response.summary || "QA did not approve the patch.");
                error.resultPersisted = true;
                throw error;
            }
            return response;
        } catch (error) {
            if (!error.resultPersisted) {
                await prisma.$transaction([
                    prisma.query.update({
                        where: { id: job.data.queryId },
                        data: { response: JSON.stringify({ success: false, error: error.message, patch: error.patch ?? null }) }
                    }),
                    prisma.task.update({ where: { id: taskId }, data: { status: "failed" } })
                ]);
            }
            throw error;
        }
    },
    {
        connection
    }
)
