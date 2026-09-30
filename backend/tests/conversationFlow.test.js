import test from "node:test";
import assert from "node:assert/strict";
import { processChat } from "../services/processChat.js";
import { conversationContext } from "../services/conversationContext.js";

test("conversation context keeps ordered user and assistant turns", async () => {
    const db = { message: { findMany: async () => [
        { role: "user", mode: "code", content: "Change the parser" },
        { role: "assistant", mode: "chat", content: "Here is the current behavior" }
    ] } };
    const context = await conversationContext(4, db);
    assert.equal(context, "assistant (chat): Here is the current behavior\n\nuser (code): Change the parser");
});

test("chat replies use the conversation working tree and save the assistant message", async () => {
    const writes = [];
    const db = {
        message: {
            findMany: async () => [{ role: "user", mode: "chat", content: "What does this do?" }],
            update: (args) => { writes.push(args); return Promise.resolve(args); }
        },
        conversation: { update: (args) => Promise.resolve(args) },
        $transaction: async (operations) => Promise.all(operations)
    };
    const job = { data: { conversationId: 4, repositoryId: 7, userId: 2, assistantMessageId: 9, query: "What does this do?" } };
    const response = await processChat(job, {
        db,
        getContainer: async ({ conversationId }) => { assert.equal(conversationId, 4); return { container: { id: "existing-container" } }; },
        role: async ({ container, allowedTools, input }) => {
            assert.equal(container.id, "existing-container");
            assert.ok(allowedTools.includes("ReadFile"));
            assert.ok(!allowedTools.includes("ApplyPatch"));
            assert.equal(input.latestMessage, "What does this do?");
            return { answer: "It parses the input." };
        }
    });
    assert.equal(response.answer, "It parses the input.");
    assert.deepEqual(writes[0].data, { content: "It parses the input.", status: "completed" });
});
