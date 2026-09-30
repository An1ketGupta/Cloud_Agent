import { prisma } from "../clients/prismaClient.js";
import { dockerClient } from "../clients/dockerClient.js";
import { taskQueue } from "../queues/taskQueue.js";

const IDLE_MS = 3 * 60_000;

export async function removeIdleConversationContainers({ db = prisma, docker = dockerClient, queue = taskQueue, now = new Date() } = {}) {
    const cutoff = new Date(now.getTime() - IDLE_MS);
    const candidates = await db.conversation.findMany({
        where: { containerId: { not: null }, updatedAt: { lte: cutoff } },
        select: { id: true, containerId: true, messages: { where: { role: "assistant", status: "pending" }, select: { id: true, taskId: true } } }
    });
    for (const conversation of candidates) {
        let inProgress = false;
        for (const message of conversation.messages) {
            const job = await queue.getJob(message.taskId ? `task-${message.taskId}` : `chat-${message.id}`);
            if (job && ["waiting", "active", "delayed", "waiting-children"].includes(await job.getState())) {
                inProgress = true;
                break;
            }
        }
        if (inProgress) continue;
        const claimed = await db.conversation.updateMany({
            where: { id: conversation.id, containerId: conversation.containerId, updatedAt: { lte: cutoff } },
            data: { containerId: null }
        });
        if (!claimed.count) continue;
        try {
            await docker.getContainer(conversation.containerId).remove({ force: true });
        } catch (error) {
            if (error.statusCode !== 404) console.error(`Could not remove idle conversation container ${conversation.containerId}:`, error);
        }
    }
}

export function startIdleConversationCleanup() {
    const timer = setInterval(() => {
        removeIdleConversationContainers().catch((error) => console.error("Idle container cleanup failed:", error));
    }, 30_000);
    timer.unref?.();
    return timer;
}
