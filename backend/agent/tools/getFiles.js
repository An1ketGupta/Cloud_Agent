export async function getFileNameList(container, filePath) {
    const exec = await container.exec({
        Cmd: [
            "find",
            filePath,
            "-type", "f", "-printf", "FILE:%p\n",
            "-o",
            "-type", "d", "-printf", "DIR:%p\n"
        ],
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

    const files = [];
    const directories = [];

    output
        .trim()
        .split("\n")
        .filter(Boolean)
        .forEach(line => {
            if (line.startsWith("FILE:")) {
                files.push(line.slice(5));
            } else if (line.startsWith("DIR:")) {
                directories.push(line.slice(4));
            }
        });

    return {
        files,
        directories
    };
}