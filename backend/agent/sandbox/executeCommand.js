export async function executeContainerCommand(container, command) {
    const exec = await container.exec({
        Cmd: ["bash", "-c", command],
        AttachStdout: true,
        AttachStderr: true
    });

    const stream = await exec.start({
        hijack: true,
        stdin: false
    });

    const output = await new Promise((resolve, reject) => {
        let result = "";

        stream.on("data", (chunk) => {
            result += chunk.toString();
        });

        stream.on("end", () => {
            resolve(result);
        });

        stream.on("error", reject);
    });

    const inspection = await exec.inspect();

    return {
        output,
        exitCode: inspection.ExitCode
    };
}