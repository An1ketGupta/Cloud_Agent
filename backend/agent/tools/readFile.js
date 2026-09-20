export async function ReadFile(container, filePath){
    const exec = await container.exec({
        Cmd : [
            "cat", filePath
        ],
        AttachStdout: true,
        AttachStderr: true
    })

    const stream = await exec.start();

    let output = "";

    await new Promise((resolve, reject) => {
        stream.on("data", chunk => {
            output += chunk.toString();
        });

        stream.on("end", resolve);
        stream.on("error", reject);
    });

    return output;
}