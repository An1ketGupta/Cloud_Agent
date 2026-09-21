export async function ReadFile(container, filePath) {
    const exec = await container.exec({
        Cmd: ["cat", "--", filePath],
        AttachStdout: true,
        AttachStderr: true
    });

    const stream = await exec.start();

    let output = "";

    await new Promise((resolve, reject) => {
        stream.on("data", chunk => {
            output += chunk.toString();
        });

        stream.on("end", resolve);
        stream.on("error", reject);
    });

    const info = await exec.inspect();

    if (info.ExitCode !== 0) {
        throw new Error(
            `Failed to read ${filePath}: ${output}`
        );
    }

    console.log("Output: ", output)

    return {
        success : true,
        output
    }
}