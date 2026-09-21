export default async function ApplyPatch(container, patch) {
    const exec = await container.exec({
        Cmd: [
            "sh",
            "-c",
            "patch -p1"
        ],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true
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

        stream.write(patch);
        stream.end();
    });

    const result = await exec.inspect();

    if (result.ExitCode !== 0) {
        throw new Error(
            `Unable to apply the patch.\n${output}`
        );
    }

    console.log("Output: ", output)

    return {
        success: true,
        output
    };
}