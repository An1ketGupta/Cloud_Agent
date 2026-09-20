export default async function ApplyPatch(container, patch) {
    const exec = await container.exec({
        Cmd: [
            "sh",
            "-c",
            "patch -p1"
        ],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
    });

    const stream = await exec.start({
        hijack: true,
        stdin: true
    });

    stream.write(patch);
    stream.end();

    let output = "";

    await new Promise((resolve, reject) => {
        stream.on("data", chunk => {
            output += chunk.toString();
        });

        stream.on("end", resolve);
        stream.on("error", reject);
    });

    const result = await exec.inspect();

    return {
        success: result.ExitCode === 0,
        output
    };
}