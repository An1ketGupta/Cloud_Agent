import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { Duplex } from "node:stream";
import assert from "node:assert/strict";
import { executeFileRequest } from "../agent/tools/fileOperationsRuntime.js";
import { fileMutationInput } from "../agent/tools/fileMutation.js";

export function repository(t, files = {}) {
    const parent = fs.realpathSync(os.tmpdir());
    const root = fs.mkdtempSync(path.join(parent, "cloud-agent-editor-"));
    t.after(() => {
        const resolved = path.resolve(root);
        assert.equal(path.dirname(resolved), parent);
        assert.ok(path.basename(resolved).startsWith("cloud-agent-editor-"));
        fs.rmSync(resolved, { recursive: true, force: true });
    });
    const git = (...args) => {
        const result = spawnSync("git", ["-c", "core.autocrlf=false", ...args], { cwd: root, encoding: "utf8" });
        assert.equal(result.status, 0, result.stderr);
        return result.stdout;
    };
    git("init", "--quiet", "--template=");
    git("config", "core.autocrlf", "false");
    for (const [name, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
        fs.writeFileSync(path.join(root, name), content);
    }
    git("add", ".");
    git("-c", "user.name=Editor Tests", "-c", "user.email=editor-tests@example.invalid", "-c", "commit.gpgsign=false", "commit", "--quiet", "--allow-empty", "-m", "fixture");
    return {
        root, git,
        read: (name) => executeFileRequest(root, { action: "read", filePath: name }),
        content: (name) => fs.readFileSync(path.join(root, name), "utf8"),
        execute: async (call) => call.name === "ReadFile"
            ? executeFileRequest(root, { action: "read", ...call.arguments })
            : executeFileRequest(root, { action: "apply", input: fileMutationInput(call.name, call.arguments) })
    };
}

// Exercise the actual container helper and JSON framing using a local child process.
export function localContainer(root) {
    const children = new WeakMap();
    return {
        modem: {
            demuxStream(stream, stdout, stderr) {
                stream.on("data", (chunk) => stdout.write(chunk));
                children.get(stream).stderr.on("data", (chunk) => stderr.write(chunk));
            }
        },
        async exec({ Cmd }) {
            let child;
            let exitCode = null;
            return {
                async start() {
                    child = spawn(Cmd[0] === "node" ? process.execPath : Cmd[0], Cmd.slice(1), { cwd: root, stdio: "pipe" });
                    child.on("exit", (code) => { exitCode = code; });
                    const stream = Duplex.from({ readable: child.stdout, writable: child.stdin });
                    children.set(stream, child);
                    return stream;
                },
                async inspect() { return { ExitCode: exitCode }; }
            };
        }
    };
}

export function editCall(repo, path, before, after, extra = {}) {
    return { name: "EditFile", arguments: { path, revision: repo.read(path).revision, edits: [{ before, after }], ...extra } };
}
