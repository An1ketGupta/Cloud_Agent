export async function writeFile(container, filePath, content){
    const exec = await container.exec({
        Cmd : [
            "sh", "-c",
            `cat >> ${filePath}`
        ],
        AttachStdout: true,
        AttachStderr : true,
        AttachStdin : true
    })

    const stream = await exec.start({
        hijack: true,
        stdin : true
    });


    stream.write(content)
    stream.end();

    await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
    });

    const result = await exec.inspect();

    return result.exitcode === 0
}