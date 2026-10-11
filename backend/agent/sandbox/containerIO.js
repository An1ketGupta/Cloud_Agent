import { Writable } from "node:stream";
import { StringDecoder } from "node:string_decoder";

export const REPOSITORY_ROOT = "/workspace/repository";

export async function runContainerExec(
    container,
    cmd,
    {
        input,
        closeStdin = true,
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
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            stream.destroy(
                new Error(`Container operation timed out after ${timeoutMs} ms.`)
            );
        }, timeoutMs);

        const output = new Writable({
            write(chunk, encoding, callback) {
                stdout += stdoutDecoder.write(chunk);
                callback();
            }
        });

        const error = new Writable({
            write(chunk, encoding, callback) {
                stderr += stderrDecoder.write(chunk);
                callback();
            }
        });

        container.modem.demuxStream(stream, output, error);

        stream.once("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });

        stream.once("end", () => {
            clearTimeout(timer);
            resolve();
        });

        if (input !== undefined) {
            if (closeStdin) stream.end(input);
            else stream.write(input);
        }
    });

    stdout += stdoutDecoder.end();
    stderr += stderrDecoder.end();
    const deadline = Date.now() + timeoutMs;
    let result = await exec.inspect();
    while (result.ExitCode === null) {
        if (Date.now() >= deadline) {
            throw new Error(`Container operation timed out after ${timeoutMs} ms.`);
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
        result = await exec.inspect();
    }

    return {
        stdout,
        stderr,
        exitCode: result.ExitCode
    };
}
