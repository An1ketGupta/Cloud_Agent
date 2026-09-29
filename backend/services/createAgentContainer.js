import { dockerClient } from "../clients/dockerClient.js";

export default async function createAgentContainer() {
    const container = await dockerClient.createContainer({
        Image: "cloud-agent",
        WorkingDir: "/workspace",
        Cmd: ["tail", "-f", "/dev/null"],
        HostConfig: {
            Memory: 1024 * 1024 * 1024,
            NanoCpus: 1_000_000_000,
            PidsLimit: 256
        }
    })
    try {
        await container.start();
    } catch (error) {
        await container.remove({ force: true }).catch(() => {});
        throw error;
    }

    return container
}
