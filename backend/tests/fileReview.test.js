import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFileReview, restoreFileBeforeRun, splitFilePatches } from "../services/fileReview.js";

const change = (path, before, after) => `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-${before}\n+${after}\n`;

test("file reviews include only files changed by the latest run", () => {
    const before = change("first.js", "one", "two");
    const after = before + change("second.js", "old", "new");
    const review = createFileReview(before, after);
    assert.deepEqual(Object.keys(review.files), ["second.js"]);
    assert.equal(review.files["second.js"], "pending");
    assert.equal(splitFilePatches(after).get("first.js"), before);
});

test("a later edit to an already changed file is reviewable", () => {
    const review = createFileReview(change("first.js", "one", "two"), change("first.js", "one", "three"));
    assert.deepEqual(Object.keys(review.files), ["first.js"]);
});

test("a run that clears an earlier diff can still be reviewed", () => {
    const review = createFileReview(change("first.js", "one", "two"), "");
    assert.deepEqual(review.revertedPaths, ["first.js"]);
    assert.ok(review.displayPatch.includes("first.js"));
    assert.equal(review.files["first.js"], "pending");
});

test("removing a later run restores earlier changes to the same file", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "cloud-agent-review-"));
    const git = (...args) => execFileSync("git", args, { cwd: directory, encoding: "utf8" });
    try {
        git("init", "-q");
        git("config", "user.email", "test@example.com");
        git("config", "user.name", "Test");
        writeFileSync(path.join(directory, "file.js"), "const value = 1;\n");
        git("add", "file.js");
        git("commit", "-qm", "base");
        writeFileSync(path.join(directory, "file.js"), "const value = 2;\n");
        const before = git("diff", "--", "file.js");
        writeFileSync(path.join(directory, "file.js"), "const value = 3;\n");
        const after = git("diff", "--", "file.js");
        const execute = async (_container, cmd, { input }) => {
            const result = spawnSync(cmd[0], cmd.slice(1), { cwd: directory, input, encoding: "utf8" });
            return { exitCode: result.status, stderr: result.stderr };
        };
        await restoreFileBeforeRun({}, before, after, execute);
        assert.equal(readFileSync(path.join(directory, "file.js"), "utf8").replace(/\r\n/g, "\n"), "const value = 2;\n");
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("removing an added file deletes it from the working tree", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "cloud-agent-review-"));
    try {
        execFileSync("git", ["init", "-q"], { cwd: directory });
        writeFileSync(path.join(directory, "new.js"), "export default 1;\n");
        execFileSync("git", ["add", "-N", "new.js"], { cwd: directory });
        const after = execFileSync("git", ["diff", "--", "new.js"], { cwd: directory, encoding: "utf8" });
        const execute = async (_container, cmd, { input }) => {
            const result = spawnSync(cmd[0], cmd.slice(1), { cwd: directory, input, encoding: "utf8" });
            return { exitCode: result.status, stderr: result.stderr };
        };
        await restoreFileBeforeRun({}, undefined, after, execute);
        assert.equal(existsSync(path.join(directory, "new.js")), false);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
