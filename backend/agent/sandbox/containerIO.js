import { Writable } from "node:stream";

export const REPOSITORY_ROOT = "/workspace/repository";

export async function runContainerExec(
    container,
    cmd,
    {
        input,
        env,
        workingDir = REPOSITORY_ROOT,
        timeoutMs = 30_000
    } = {}
) {
    const exec = await container.exec({
        Cmd: cmd,
        WorkingDir: workingDir,
        Env: env,
        AttachStdin: input !== undefined,
        AttachStdout: true,
        AttachStderr: true
    });

    const stream = await exec.start({
        hijack: true,
        stdin: input !== undefined
    });

    let stdout = "";
    let stderr = "";

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            stream.destroy(
                new Error(`Container operation timed out after ${timeoutMs} ms.`)
            );
        }, timeoutMs);

        const output = new Writable({
            write(chunk, encoding, callback) {
                stdout += chunk.toString();
                callback();
            }
        });

        const error = new Writable({
            write(chunk, encoding, callback) {
                stderr += chunk.toString();
                callback();
            }
        });

        container.modem.demuxStream(stream, output, error);

        stream.once("error", reject);

        stream.once("end", () => {
            clearTimeout(timer);
            resolve();
        });

        if (input !== undefined) {
            stream.end(input);
        }
    });

    const result = await exec.inspect();

    return {
        stdout,
        stderr,
        exitCode: result.ExitCode
    };
}