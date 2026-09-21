export async function SearchFile(container, filePath) {
    const length = filePath.length;

    let pos = -1;

    for (let i = length - 1; i >= 0; i--) {
        if (filePath[i] === "/") {
            pos = i;
            break;
        }
    }

    const fileName = filePath.substring(pos + 1);
    const directory = filePath.substring(0, pos);

    const exec = await container.exec({
        Cmd: [
            "find",
            directory,
            "-name",
            fileName,
            "-type",
            "f",
            "-print"
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

    return output.trim().length > 0;
}