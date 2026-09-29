import { prisma } from "../clients/prismaClient.js"
import { taskQueue } from "../queues/taskQueue.js";

export async function NewTask(req, res) {
    try {
        const user = req.user;
        const { query, repositoryId, repoName } = req.body;
        if (!query || typeof query !== "string" || query.trim() === "") {
            return res.status(400).json({
                success: false,
                error: "Query is required",
            });
        }
        const selection = Number.isInteger(Number(repositoryId)) && repositoryId != null
            ? { id: Number(repositoryId) }
            : typeof repoName === "string" && repoName.trim()
                ? { OR: [{ fullName: repoName.trim() }, { name: repoName.trim() }] }
                : null;
        if (!selection) return res.status(400).json({ success: false, error: "Select a repository." });
        const matches = await prisma.githubRepository.findMany({
            where: { ...selection, githubAccount: { userId: user.userId } },
            take: 2
        });
        if (matches.length !== 1) {
            return res.status(400).json({
                success: false,
                error: matches.length ? "Repository name is ambiguous; supply repositoryId." : "Repository not found for this user."
            });
        }

        const task = await prisma.task.create({
            data: {
                userId: user.userId,
                repositoryId: matches[0].id,
                status: 'pending',
                conversation: {
                    create: {
                        query: query.trim(),
                        response: "",
                    },
                },
            },
            include: { conversation: true, repository: { select: { id: true, fullName: true } } },
        });

        try {
            await taskQueue.add(
                "agent-task", {
                taskId: task.id,
                query: query.trim(),
                queryId: task.conversation[0].id,
                repositoryId: matches[0].id,
                userId: task.userId
            }
            );
        } catch (queueError) {
            await prisma.$transaction([
                prisma.query.update({
                    where: { id: task.conversation[0].id },
                    data: { response: JSON.stringify({ success: false, error: "Unable to enqueue task." }) }
                }),
                prisma.task.update({ where: { id: task.id }, data: { status: "failed" } })
            ]);
            throw queueError;
        }

        return res.status(201).json({
            success: true,
            message : "Pushed into the message queue.",
            task,
        });

    } catch (error) {
        console.error("Error creating task:", error);

        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}


export async function getTask(req, res) {
    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(taskId)) return res.status(400).json({ error: "Invalid task ID." });
    const task = await prisma.task.findFirst({
        where: { id: taskId, userId: req.user.userId },
        include: {
            conversation: true,
            repository: { select: { id: true, fullName: true, htmlUrl: true } }
        }
    });
    if (!task) return res.status(404).json({ error: "Task not found." });
    const resultText = task.conversation[0]?.response;
    let result = null;
    if (resultText) {
        try { result = JSON.parse(resultText); } catch { result = { message: resultText }; }
    }
    return res.json({ task, result });
}

export async function listTasks(req, res) {
    const tasks = await prisma.task.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
            conversation: true,
            repository: { select: { id: true, fullName: true } }
        }
    });
    res.json({ tasks: tasks.map(({ conversation, ...task }) => ({
        ...task,
        prompt: conversation[0]?.query || ""
    })) });
}

export async function continueTask(req, res) {
    return res.status(501).json({ error: "Task continuation is not available in this phase." });
}
