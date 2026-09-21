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

    const result = await exec.inspect();
    if(result.ExitCode != 0){
        throw new Error("Unable to search the file.")
    }

    console.log(output)

    return {
        success: result.ExitCode === 0,
        output
    };
}