import { z } from "zod";
import { runRole } from "./roleRunner.js";
import { GitDiff } from "../tools/gitDiff.js";
import { normalizeRepositoryPath } from "../tools/repositoryPath.js";
import { getFileNameList } from "../tools/getFiles.js";
import { FILE_MUTATION_TOOLS } from "../tools/fileMutation.js";
import { createFileOperationBudget } from "./fileOperationGuard.js";

const filePath = z.string().min(1);

const custodianSchema = z.object({
    repositorySummary: z.string().min(1),
    candidateFiles: z.array(filePath).max(30),
    notes: z.array(z.string()).default([]),
    blockedReason: z.string().min(1).nullable().default(null)
});

const taskSchema = z.object({
    id: z.string().min(1),
    role: z.string().min(1),
    instructions: z.string().min(1),
    files: z.array(filePath).min(1),
    dependencies: z.array(z.string()).default([])
});

const managerSchema = z.object({
    goal: z.string().min(1),
    acceptanceCriteria: z.array(z.string()).min(1),
    tasks: z.array(taskSchema).min(1).max(8)
});

const developerSchema = z.object({
    summary: z.string().min(1),
    changedFiles: z.array(filePath)
});

const kickoffSchema = z.object({
    concerns: z.array(z.string()).default([]),
    suggestions: z.array(z.string()).default([])
});

const qaSchema = z.object({
    decision: z.enum(["approve", "revise"]),
    findings: z.array(
        z.object({
            file: z.string().optional(),
            issue: z.string().min(1)
        })
    ).default([])
});

const READ_TOOLS = [
    "getFileNameList",
    "SearchFile",
    "SearchContent",
    "ReadFile"
];

const DEVELOPER_TOOLS = [
    ...READ_TOOLS,
    ...FILE_MUTATION_TOOLS,
    "GitDiff"
];

const QA_TOOLS = [
    ...READ_TOOLS,
    "GitDiff"
];

export function checkPlan(plan) {
    const ids = new Set(plan.tasks.map((task) => task.id));

    if (ids.size !== plan.tasks.length) {
        throw new Error("Manager returned duplicate task IDs.");
    }

    for (const task of plan.tasks) {
        for (const file of task.files) {
            normalizeRepositoryPath(file);
        }

        for (const dependency of task.dependencies) {
            if (!ids.has(dependency) || dependency === task.id) {
                throw new Error(`Invalid dependency in task ${task.id}.`);
            }
        }
    }

    const visited = new Set();
    const visiting = new Set();
    const tasks = new Map(
        plan.tasks.map((task) => [task.id, task])
    );

    function visit(id) {
        if (visiting.has(id)) {
            throw new Error("Manager returned a cyclic task plan.");
        }

        if (visited.has(id)) {
            return;
        }

        visiting.add(id);

        for (const dependency of tasks.get(id).dependencies) {
            visit(dependency);
        }

        visiting.delete(id);
        visited.add(id);
    }

    for (const id of ids) {
        visit(id);
    }

    return [...visited].map((id) => tasks.get(id));
}

export async function getValidatedPlan(role, options) {
    let validationError;
    let invalidPlan;

    for (let attempt = 0; attempt < 3; attempt++) {
        const plan = await role({
            ...options,
            input: validationError
                ? { ...options.input, invalidPlan, validationError }
                : options.input
        });

        try {
            checkPlan(plan);
            return plan;
        } catch (error) {
            invalidPlan = plan;
            validationError = error.message;
        }
    }

    throw new Error(`${options.name} returned an invalid plan after three attempts: ${validationError}`);
}

export async function runWorkCop({ container, request, onProgress = async () => {}, onAgentResult = async () => {}, roleRunner = runRole,
    inventoryReader = getFileNameList, diffReader = GitDiff }) {
    const fileOperationBudget = createFileOperationBudget();
    await onProgress("Reading the repository file inventory.");
    let repositoryInventory = await inventoryReader(container, { filePath: ".", limit: 500, offset: 0 });
    await onProgress(`Repository inventory: ${repositoryInventory.returnedCount}/${repositoryInventory.totalMatches} files; directories=${JSON.stringify(repositoryInventory.directories)}; files=${JSON.stringify(repositoryInventory.files.slice(0, 30))}.`);
    let inventoryDirty = false;
    async function role(options) {
        if (inventoryDirty) {
            repositoryInventory = await inventoryReader(container, { filePath: ".", limit: 500, offset: 0 });
            inventoryDirty = false;
        }
        await onProgress(`${options.name} started.`);
        const result = await roleRunner({ ...options, input: { ...options.input, repositoryInventory }, onProgress, fileOperationBudget });
        if (options.allowedTools.some((name) => FILE_MUTATION_TOOLS.includes(name))) inventoryDirty = true;
        await onAgentResult({ agent: options.name, output: result });
        await onProgress(`${options.name} finished.`);
        return result;
    }

    const custodian = await role({
        name: "Repository Custodian",
        container,
        allowedTools: READ_TOOLS,
        outputSchema: custodianSchema,

        systemPrompt: `You are WorkCop's Repository Custodian.
Locate the files relevant to the user's request. Use only your listed read tools.
Use the supplied repositoryInventory, inspect relevant files with ReadFile, and stop discovery as soon as paths are known.
Keep context focused.
Return only JSON with repositorySummary, candidateFiles (existing repository-relative paths), notes, and blockedReason (null when work can proceed).
If the request needs an existing application's source but the inventory and file contents show it is absent, set blockedReason explaining the missing source and asking the user to select the correct repository. Do not invent missing files or plan a replacement application. Requests to create a new application may proceed.
If the inventory is truncated, inspect remaining pages or use focused filename searches before concluding that required source is absent.
Include existing relevant source and test files; do not claim to have run anything.`,

        input: {
            request,
            repositoryRoot: "/workspace/repository"
        }
    });

    custodian.candidateFiles.forEach(normalizeRepositoryPath);
    if (custodian.blockedReason) {
        throw new Error(`Requested source files are unavailable in the selected repository: ${custodian.blockedReason}`);
    }

    let plan = await getValidatedPlan(role, {
        name: "Manager",
        container,
        allowedTools: READ_TOOLS,
        outputSchema: managerSchema,

        systemPrompt: `You are WorkCop's Manager.
Turn the user's request and Custodian findings into a small, complete plan for the repository.
Assign focused developer roles and explicit file-level tasks.
Use the supplied repositoryInventory and Custodian findings; do not repeat repository exploration. Plan implementation tasks that change code, not separate discovery tasks. Match the repository's actual language and structure; a plain HTML/CSS/JavaScript project does not imply an existing Node.js backend. Prefer one implementation task for small changes.
Include dependencies; prefer tasks that can be executed in a clear order.
Your plan must cover the whole issue.
Every file path must be repository-relative to /workspace/repository (for example src/index.js), using / separators. If validationError is present, correct the plan before responding.
Return only JSON with goal, acceptanceCriteria, and tasks.
Each task needs id, role, instructions, files, and dependencies.
No commands, tests, builds, commits, or pull requests.`,

        input: {
            request,
            custodian
        }
    });

    const kickoffFeedback = [];

    for (const task of plan.tasks) {
        const feedback = await role({
            name: `Kickoff ${task.id}`,
            container,
            allowedTools: READ_TOOLS,
            outputSchema: kickoffSchema,

            systemPrompt: `You are WorkCop's ${task.role}, reviewing the Manager's implementation plan before coding.
Check whether your assignment is feasible, the affected files are plausible, and the task order covers dependencies.
Use only read tools.
Use the supplied repositoryInventory and inspect only files needed to check your assignment. Do not repeat broad discovery.
Return only JSON with concerns and suggestions.
Do not make changes.`,

            input: {
                request,
                task,
                plan
            }
        });

        kickoffFeedback.push({
            taskId: task.id,
            ...feedback
        });
    }

    const needsPlanRevision = kickoffFeedback.some(
        (item) =>
            item.concerns.length > 0 ||
            item.suggestions.length > 0
    );

    if (needsPlanRevision) {
        plan = await getValidatedPlan(role, {
            name: "Manager Plan Revision",
            container,
            allowedTools: READ_TOOLS,
            outputSchema: managerSchema,

            systemPrompt: `You are WorkCop's Manager.
Review developer kickoff feedback and finalize a complete, feasible implementation plan for the repository's actual stack.
Resolve conflicts and dependencies.
Every file path must be repository-relative to /workspace/repository (for example src/index.js), using / separators. If validationError is present, correct the plan before responding.
Return only JSON with goal, acceptanceCriteria, and tasks.
Each task needs id, role, instructions, files, and dependencies.
No commands, tests, builds, commits, or pull requests.`,

            input: {
                request,
                custodian,
                initialPlan: plan,
                kickoffFeedback
            }
        });
    }

    const orderedTasks = checkPlan(plan);
    const developerResults = [];

    for (const task of orderedTasks) {
        const result = await role({
            name: `Developer ${task.id}`,
            container,
            allowedTools: DEVELOPER_TOOLS,
            outputSchema: developerSchema,

            systemPrompt: `You are WorkCop's ${task.role}.
Implement your assigned code change in /workspace/repository.
Read relevant files and use CreateFile, EditFile, or DeleteFile for ordinary changes, one file at a time. Use ApplyPatch only for related changes that must succeed atomically.
For updates/deletes, copy the revision from ReadFile or the latest successful edit. Keep replacements small. After a conflict, use the automatic recovery reread and candidate code to correct the failed edit; read again only if recovery failed or the target code is outside the returned page.
You may use only your listed tools.
Do not run commands or claim that tests/builds ran.
Review GitDiff before finishing.
Return only JSON with summary and changedFiles.`,

            input: {
                request,
                task,
                acceptanceCriteria: plan.acceptanceCriteria,
                priorResults: developerResults
            }
        });

        result.changedFiles.forEach(normalizeRepositoryPath);

        developerResults.push({
            taskId: task.id,
            ...result
        });
    }

    let review;

    for (let attempt = 0; attempt < 3; attempt++) {
        const diff = await diffReader(container);

        if (!diff.patch) {
            throw new Error("Developers completed without applying a patch.");
        }

        if (diff.truncated) {
            throw new Error("Patch is too large for QA review.");
        }

        review = await role({
            name: "QA",
            container,
            allowedTools: QA_TOOLS,
            outputSchema: qaSchema,

            systemPrompt: `You are WorkCop's QA reviewer.
Review the current patch against the user's request and Manager acceptance criteria.
Inspect relevant repository files through your read tools.
Assess code logic, scope, integration, and obvious syntax issues by reading only.
You have no test/build tools, so never claim tests passed or that code was executed.
Return only JSON: decision is approve or revise, findings is an array of {file, issue}.
Approve only when the patch appears to satisfy the request.`,

            input: {
                request,
                plan,
                patch: diff.patch,
                developerResults
            }
        });

        if (review.decision === "approve") {
            return {
                approved: true,
                summary: developerResults
                    .map((result) => result.summary)
                    .join("\n"),
                patch: diff.patch,
                plan,
                kickoffFeedback,
                review
            };
        }

        if (attempt === 2) {
            break;
        }

        const revision = await role({
            name: "Revision Developer",
            container,
            allowedTools: DEVELOPER_TOOLS,
            outputSchema: developerSchema,

            systemPrompt: `You are WorkCop's revision developer for this repository.
Address every QA finding using your listed repository tools.
Inspect current files, use CreateFile/EditFile/DeleteFile for focused single-file changes, and review GitDiff. Reserve ApplyPatch for atomic batches.
Use revisions from ReadFile or the latest successful edit. After a conflict, correct the edit using the automatic recovery reread and candidate code. Do not repeat successful earlier edits.
Do not run tests/builds or claim they ran.
Return only JSON with summary and changedFiles.`,

            input: {
                request,
                plan,
                findings: review.findings,
                currentPatch: diff.patch
            }
        });

        revision.changedFiles.forEach(normalizeRepositoryPath);

        developerResults.push({
            taskId: `revision-${attempt + 1}`,
            ...revision
        });
    }

    const finalDiff = await diffReader(container);

    return {
        approved: false,
        summary: `QA requested further changes: ${review.findings
            .map((item) => item.issue)
            .join("; ")}`,
        patch: finalDiff.patch,
        plan,
        kickoffFeedback,
        review
    };
}
