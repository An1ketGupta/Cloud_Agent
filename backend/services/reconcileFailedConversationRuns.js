import { prisma } from "../clients/prismaClient.js";
import { taskQueue } from "../queues/taskQueue.js";

const failureMessage = "The agent run stopped unexpectedly. Please try again.";

export async function reconcileFailedConversationRuns(conversation, { db = prisma, queue = taskQueue } = {}) {
    const pending = conversation.messages.filter((message) => message.role === "assistant" && message.status === "pending");
    await Promise.all(pending.map(async (message) => {
        try {
            const job = await queue.getJob(message.taskId ? `task-${message.taskId}` : `chat-${message.id}`);
            if (!job || await job.getState() !== "failed") return;

            const updated = await db.$transaction(async (tx) => {
                const result = await tx.message.updateMany({
                    where: { id: message.id, status: "pending" },
                    data: { status: "failed", content: failureMessage }
                });
                if (result.count && message.taskId) {
                    await tx.task.updateMany({
                        where: { id: message.taskId, status: { in: ["pending", "runnning"] } },
                        data: { status: "failed" }
                    });
                }
                return result;
            });
            if (!updated.count) return;
            message.status = "failed";
            message.content = failureMessage;

            if (message.taskId) {
                const task = conversation.tasks.find((item) => item.id === message.taskId);
                if (task && (task.status === "pending" || task.status === "runnning")) task.status = "failed";
            }
        } catch (error) {
            console.error(`Could not reconcile conversation message ${message.id}:`, error);
        }
    }));
}
