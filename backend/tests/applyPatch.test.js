import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { preparePatch } from "../agent/tools/applyPatch.js";

test("new-file ApplyPatch syntax produces a patch Git can apply", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "cloud-agent-patch-"));
    try {
        execFileSync("git", ["init", "-q"], { cwd: directory });
        const patch = await preparePatch("*** Begin Patch\n*** Add File: test.js\n+console.log('ready');\n*** End Patch");
        execFileSync("git", ["apply", "--check", "--recount", "-"], {
            cwd: directory,
            input: patch
        });
        execFileSync("git", ["apply", "--recount", "-"], {
            cwd: directory,
            input: patch
        });
        assert.equal(execFileSync("git", ["status", "--short"], { cwd: directory, encoding: "utf8" }).trim(), "?? test.js");
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("plain unified diffs receive Git headers", async () => {
    const patch = await preparePatch("--- test.js\n+++ test.js\n@@ -1 +1 @@\n-old\n+new\n");
    assert.match(patch, /^diff --git a\/test\.js b\/test\.js\n--- a\/test\.js/);
    assert.match(patch, /\n\+\+\+ b\/test\.js\n/);
});

test("a missing closing marker on a complete add-file patch is recovered", async () => {
    const patch = await preparePatch("*** Begin Patch\n*** Add File: test.js\n+export default 1;");
    assert.match(patch, /^diff --git a\/test\.js b\/test\.js/);
    assert.match(patch, /\+export default 1;\n$/);
});

test("first Update File patch applies to an existing file", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "cloud-agent-patch-"));
    try {
        execFileSync("git", ["init", "-q"], { cwd: directory });
        writeFileSync(path.join(directory, "test.js"), "const value = 1;\nconsole.log(value);\n");
        const patch = await preparePatch(
            "*** Begin Patch\n*** Update File: test.js\n@@\n-const value = 1;\n+const value = 2;\n console.log(value);\n*** End Patch",
            (file) => readFileSync(path.join(directory, file), "utf8")
        );
        execFileSync("git", ["apply", "--check", "--recount", "-"], { cwd: directory, input: patch });
        execFileSync("git", ["apply", "--recount", "-"], { cwd: directory, input: patch });
        assert.equal(readFileSync(path.join(directory, "test.js"), "utf8").replace(/\r\n/g, "\n"), "const value = 2;\nconsole.log(value);\n");
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("multiple anchored update sections apply in order", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "cloud-agent-patch-"));
    try {
        execFileSync("git", ["init", "-q"], { cwd: directory });
        writeFileSync(path.join(directory, "test.js"), "function first() {\n  return 1;\n}\nfunction second() {\n  return 2;\n}\n");
        const patch = await preparePatch(
            "*** Begin Patch\n*** Update File: test.js\n@@ function first() {\n-  return 1;\n+  return 10;\n@@ function second() {\n-  return 2;\n+  return 20;\n*** End Patch",
            (file) => readFileSync(path.join(directory, file), "utf8")
        );
        execFileSync("git", ["apply", "--check", "--recount", "-"], { cwd: directory, input: patch });
        execFileSync("git", ["apply", "--recount", "-"], { cwd: directory, input: patch });
        const result = readFileSync(path.join(directory, "test.js"), "utf8").replace(/\r\n/g, "\n");
        assert.match(result, /return 10;/);
        assert.match(result, /return 20;/);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("Update File matches content with CRLF line endings", async () => {
    const patch = await preparePatch(
        "*** Begin Patch\n*** Update File: test.js\n@@\n-old\n+new\n*** End Patch",
        async () => "old\r\n"
    );
    assert.match(patch, /\+new\r\n/);
});

test("unsupported patch text explains accepted formats", async () => {
    await assert.rejects(preparePatch("*** Update File: test.js"), /diff --git.*Add File/);
});
