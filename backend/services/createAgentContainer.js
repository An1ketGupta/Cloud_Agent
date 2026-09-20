import { dockerClient } from "../clients/dockerClient.js";

export default async function createAgentContainer() {
    const container = await dockerClient.createContainer({
        Image: "cloud-agent",
        WorkingDir: "/workspace",
        Cmd: ["tail", "-f", "/dev/null"]
    })
    await container.start();

    return container
}