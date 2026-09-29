import { dockerClient } from "../../clients/dockerClient.js";
import { cloneRepository } from "../github/cloneRepository.js";
import { runWorkCop } from "../workcop/workCop.js";
import { GitDiff } from "../tools/gitDiff.js";

export async function runAgentTask({ taskId, query, repositoryId, userId }) {
    if (!taskId || !repositoryId || !userId) {
        throw new Error("Task, repository, and user IDs are required.");
    }

    if (!query || !query.trim()) {
        throw new Error("A user request is required.");
    }

    let container;
    let cloned = false;

    try {
        container = await dockerClient.createContainer({
            Image: "cloud-agent",
            WorkingDir: "/workspace",
            Cmd: ["tail", "-f", "/dev/null"],
            HostConfig: {
                Memory: 1024 * 1024 * 1024,
                NanoCpus: 1_000_000_000,
                PidsLimit: 256
            }
        });

        await container.start();

        const repo = await cloneRepository(
            container,
            repositoryId,
            userId
        );

        cloned = true;

        const result = await runWorkCop({
            container,
            request: query.trim()
        });

        return {
            success: result.approved,
            taskId,
            repository: repo.repository,
            ...result
        };

    } catch (error) {
        if (cloned) {
            try {
                error.patch = (await GitDiff(container)).patch;
            } catch {}
        }

        throw error;

    } finally {
        if (container) {
            await container.remove({ force: true }).catch(() => {});
        }
    }
}
