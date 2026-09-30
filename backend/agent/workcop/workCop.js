import { z } from "zod";
import { runRole } from "./roleRunner.js";
import { GitDiff } from "../tools/gitDiff.js";
import { normalizeRepositoryPath } from "../tools/repositoryPath.js";

const filePath = z.string().min(1);

const custodianSchema = z.object({
    repositorySummary: z.string().min(1),
    candidateFiles: z.array(filePath).max(30),
    notes: z.array(z.string()).default([])
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
    "ApplyPatch",
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

export async function runWorkCop({ container, request, onProgress = async () => {}, roleRunner = runRole }) {
    async function role(options) {
        await onProgress(`${options.name} started.`);
        const result = await roleRunner({ ...options, onProgress });
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
Start at /workspace/repository, inspect the repository structure and relevant files.
Keep context focused.
Return only JSON with repositorySummary, candidateFiles (repository-relative paths), and notes.
Include likely existing files and test files; do not claim to have run anything.`,

        input: {
            request,
            repositoryRoot: "/workspace/repository"
        }
    });

    custodian.candidateFiles.forEach(normalizeRepositoryPath);

    let plan = await getValidatedPlan(role, {
        name: "Manager",
        container,
        allowedTools: READ_TOOLS,
        outputSchema: managerSchema,

        systemPrompt: `You are WorkCop's Manager.
Turn the user's request and Custodian findings into a small, complete plan for the repository.
Assign focused developer roles and explicit file-level tasks.
Include dependencies; prefer tasks that can be executed in a clear order.
Your plan must cover the whole issue.
Every file path must be relative to /workspace/repository (for example src/index.js), or an absolute path inside that directory. If validationError is present, correct the plan before responding.
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
Review developer kickoff feedback and finalize a complete, feasible Node.js implementation plan.
Resolve conflicts and dependencies.
Every file path must be relative to /workspace/repository (for example src/index.js), or an absolute path inside that directory. If validationError is present, correct the plan before responding.
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
Read relevant files, locate the correct code, and use ApplyPatch for every change, including new files.
Use *** Begin Patch / *** Update File: path / @@ / context and +/- lines / *** End Patch for edits. Use *** Add File for new files. Git unified diffs are also accepted. After a patch error, read the current file or GitDiff before retrying.
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
        const diff = await GitDiff(container);

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
Inspect current files, apply focused patches with ApplyPatch, and review GitDiff.
Use *** Begin Patch with *** Update File and @@ sections for edits, or *** Add File for new files. Git unified diffs are also accepted. After a patch error, inspect the current file before retrying.
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

    const finalDiff = await GitDiff(container);

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
