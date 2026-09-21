export async function writeFile(container, filePath, content) {
    const exec = await container.exec({
        Cmd: [
            "sh",
            "-c",
            `cat >> "$1"`,
            "--",
            filePath
        ],
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: true
    });

    const stream = await exec.start({
        hijack: true,
        stdin: true
    });

    let output = "";

    stream.on("data", chunk => {
        output += chunk.toString();
    });

    await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);

        stream.write(content);
        stream.end();
    });

    const result = await exec.inspect();

    console.log("Output:", output);

    if (result.ExitCode !== 0) {
        throw new Error(
            `Unable to write file "${filePath}". ${output}`
        );
    }

    return {
        success: true,
        output
    };
}