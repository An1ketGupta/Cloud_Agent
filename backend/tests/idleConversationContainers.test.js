import test, { after } from "node:test";
import assert from "node:assert/strict";
import { removeIdleConversationContainers } from "../services/idleConversationContainers.js";
import { taskQueue } from "../queues/taskQueue.js";

after(async () => { await taskQueue.close(); });

test("idle containers are removed after three minutes", async () => {
    let removed = false;
    const db = { conversation: {
        findMany: async ({ where }) => { assert.equal(where.updatedAt.lte.toISOString(), "2026-09-30T11:57:00.000Z"); return [{ id: 1, containerId: "container-1", messages: [] }]; },
        updateMany: async () => ({ count: 1 })
    } };
    const docker = { getContainer: () => ({ remove: async () => { removed = true; } }) };
    await removeIdleConversationContainers({ db, docker, now: new Date("2026-09-30T12:00:00.000Z") });
    assert.equal(removed, true);
});

test("an active agent job keeps its conversation container", async () => {
    let claimed = false;
    const db = { conversation: {
        findMany: async () => [{ id: 1, containerId: "container-1", messages: [{ id: 2, taskId: 3 }] }],
        updateMany: async () => { claimed = true; return { count: 1 }; }
    } };
    const queue = { getJob: async (id) => { assert.equal(id, "task-3"); return { getState: async () => "active" }; } };
    await removeIdleConversationContainers({ db, queue });
    assert.equal(claimed, false);
});
