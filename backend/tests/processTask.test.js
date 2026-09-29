import test from "node:test";
import assert from "node:assert/strict";
import { processTask } from "../services/processTask.js";

function fixture(runAgents) {
    const state = { status: "pending", response: "", removed: false, progress: [] };
    const container = {
        id: "test-container",
        async remove() { state.removed = true; }
    };
    const db = {
        task: { async update({ data }) { state.status = data.status; } },
        query: { async update({ data }) { state.response = data.response; } },
        async $transaction(operations) { await Promise.all(operations); }
    };
    const job = {
        data: { taskId: 1, queryId: 2, repositoryId: 3, userId: 4, query: "  Add test.js  " },
        async updateProgress(message) { state.progress.push(message); }
    };
    const dependencies = {
        db,
        createContainer: async () => container,
        clone: async () => ({ repository: "owner/repo", root: "/workspace/repository" }),
        runAgents,
        readDiff: async () => ({ patch: "partial patch" })
    };
    return { state, job, dependencies };
}

test("an approved agent result saves the patch and keeps its container", async () => {
    const { state, job, dependencies } = fixture(async ({ request, onProgress }) => {
        assert.equal(request, "Add test.js");
        await onProgress("Developer finished.");
        return { approved: true, summary: "Added test.js", patch: "complete patch", review: { decision: "approve" } };
    });

    const result = await processTask(job, dependencies);

    assert.equal(state.status, "completed");
    assert.equal(state.removed, false);
    assert.equal(result.containerId, "test-container");
    assert.equal(result.patch, "complete patch");
    assert.equal(JSON.parse(state.response).review.decision, "approve");
    assert.ok(state.progress.includes("Developer finished."));
});

test("a QA rejection saves its findings and removes the container", async () => {
    const { state, job, dependencies } = fixture(async () => ({
        approved: false,
        summary: "QA requested a fix",
        patch: "reviewed patch",
        review: { decision: "revise", findings: [{ issue: "Missing validation" }] }
    }));

    await assert.rejects(processTask(job, dependencies), /QA requested a fix/);

    assert.equal(state.status, "failed");
    assert.equal(state.removed, true);
    assert.equal(JSON.parse(state.response).patch, "reviewed patch");
    assert.equal(JSON.parse(state.response).review.findings[0].issue, "Missing validation");
});

test("an agent error saves a partial diff and removes the container", async () => {
    const { state, job, dependencies } = fixture(async () => { throw new Error("Model unavailable"); });

    await assert.rejects(processTask(job, dependencies), /Model unavailable/);

    assert.equal(state.status, "failed");
    assert.equal(state.removed, true);
    assert.deepEqual(JSON.parse(state.response), {
        success: false,
        error: "Model unavailable",
        patch: "partial patch"
    });
});
