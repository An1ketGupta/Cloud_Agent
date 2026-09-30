import test from "node:test";
import assert from "node:assert/strict";
import { checkPlan, getValidatedPlan, runWorkCop } from "../agent/workcop/workCop.js";

const task = (file) => ({
    id: "implement",
    role: "Developer",
    instructions: "Update the file.",
    files: [file],
    dependencies: []
});

const plan = (file) => ({
    goal: "Update the application",
    acceptanceCriteria: ["The change is present."],
    tasks: [task(file)]
});

test("plan paths can be relative or absolute inside the cloned repository", () => {
    assert.equal(checkPlan(plan("src/index.js")).length, 1);
    assert.equal(checkPlan(plan("/workspace/repository/src/index.js")).length, 1);
    assert.throws(() => checkPlan(plan("/workspace/other/src/index.js")), /Path must remain inside/);
});

test("invalid manager paths are sent back for correction", async () => {
    const inputs = [];
    const role = async ({ input }) => {
        inputs.push(input);
        return inputs.length === 1
            ? plan("/workspace/other/src/index.js")
            : plan("src/index.js");
    };

    const result = await getValidatedPlan(role, {
        name: "Manager Plan Revision",
        input: { request: "Update the application" }
    });

    assert.equal(result.tasks[0].files[0], "src/index.js");
    assert.equal(inputs.length, 2);
    assert.match(inputs[1].validationError, /\/workspace\/other\/src\/index\.js/);
    assert.equal(inputs[1].invalidPlan.tasks[0].files[0], "/workspace/other/src/index.js");
});

test("an uncorrected invalid plan fails after three attempts", async () => {
    let attempts = 0;
    await assert.rejects(
        getValidatedPlan(async () => {
            attempts++;
            return plan("/workspace/other/src/index.js");
        }, { name: "Manager", input: {} }),
        /Manager returned an invalid plan after three attempts/
    );
    assert.equal(attempts, 3);
});

test("custodian and manager outputs are published before a later agent fails", async () => {
    const outputs = [];
    await assert.rejects(runWorkCop({
        container: {},
        request: "Update the application",
        onAgentResult: async (entry) => outputs.push(entry),
        roleRunner: async ({ name }) => {
            if (name === "Repository Custodian") return {
                repositorySummary: "Small application",
                candidateFiles: ["src/index.js"],
                notes: []
            };
            if (name === "Manager") return plan("src/index.js");
            throw new Error("Kickoff unavailable");
        }
    }), /Kickoff unavailable/);

    assert.deepEqual(outputs.map((entry) => entry.agent), ["Repository Custodian", "Manager"]);
    assert.deepEqual(outputs[0].output.candidateFiles, ["src/index.js"]);
    assert.deepEqual(outputs[1].output.tasks[0].files, ["src/index.js"]);
});
