import { dockerClient } from "../clients/dockerClient.js";
import { prisma } from "../clients/prismaClient.js";
import createAgentContainer from "./createAgentContainer.js";
import { cloneRepository } from "../agent/github/cloneRepository.js";
import { runContainerExec } from "../agent/sandbox/containerIO.js";

export async function getConversationContainer({ conversationId, repositoryId, userId, db = prisma,
    docker = dockerClient, createContainer = createAgentContainer, clone = cloneRepository }) {
    const conversation = await db.conversation.findFirst({ where: { id: conversationId, userId } });
    if (!conversation || conversation.repositoryId !== repositoryId) throw new Error("Conversation repository is unavailable.");
    if (conversation.containerId) {
        try {
            const existing = docker.getContainer(conversation.containerId);
            const info = await existing.inspect();
            if (!info.State.Running) await existing.start();
            return { container: existing, reused: true };
        } catch (error) {
            if (error.statusCode !== 404) throw error;
        }
    }

    const container = await createContainer();
    try {
        await clone(container, repositoryId, userId);
        const previousTasks = await db.task.findMany({
            where: { conversationId, status: { in: ["completed", "failed"] } },
            orderBy: { id: "desc" },
            include: { conversation: true }
        });
        const previousPatch = previousTasks.map((task) => {
            try { return JSON.parse(task.conversation[0]?.response || "null")?.patch; } catch { return null; }
        }).find(Boolean);
        if (previousPatch) {
            const applied = await runContainerExec(container, ["git", "apply", "--whitespace=nowarn", "-"], {
                input: previousPatch, timeoutMs: 60_000
            });
            if (applied.exitCode !== 0) throw new Error("Could not restore previous code changes in this conversation.");
        }
        await db.conversation.update({ where: { id: conversationId }, data: { containerId: container.id } });
        return { container, reused: false };
    } catch (error) {
        await container.remove({ force: true }).catch(() => {});
        throw error;
    }
}
