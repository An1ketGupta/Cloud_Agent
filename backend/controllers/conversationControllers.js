import { prisma } from "../clients/prismaClient.js";
import { taskQueue } from "../queues/taskQueue.js";

const repositorySelect = { id: true, fullName: true, htmlUrl: true };

function validId(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
}

function messageText(value) {
    return typeof value === "string" ? value.trim() : "";
}

export async function listConversations(req, res) {
    const conversations = await prisma.conversation.findMany({
        where: { userId: req.user.userId },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: { repository: { select: repositorySelect }, messages: { orderBy: { id: "desc" }, take: 1 } }
    });
    res.json({ conversations });
}

export async function createConversation(req, res) {
    const repositoryId = validId(req.body.repositoryId);
    if (!repositoryId) return res.status(400).json({ error: "Select a repository." });
    const repository = await prisma.githubRepository.findFirst({
        where: { id: repositoryId, githubAccount: { userId: req.user.userId } },
        select: repositorySelect
    });
    if (!repository) return res.status(404).json({ error: "Repository not found." });
    const conversation = await prisma.conversation.create({
        data: { userId: req.user.userId, repositoryId, title: "New conversation" },
        include: { repository: { select: repositorySelect } }
    });
    res.status(201).json({ conversation });
}

export async function getConversation(req, res) {
    const id = validId(req.params.conversationId);
    if (!id) return res.status(400).json({ error: "Invalid conversation ID." });
    const conversation = await prisma.conversation.findFirst({
        where: { id, userId: req.user.userId },
        include: {
            repository: { select: repositorySelect },
            messages: { orderBy: { id: "asc" } },
            tasks: { orderBy: { id: "asc" }, include: { conversation: true } }
        }
    });
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    const activeTasks = conversation.tasks.filter((task) => task.status === "pending" || task.status === "runnning");
    const execution = {};
    await Promise.all(activeTasks.map(async (task) => {
        try {
            const job = await taskQueue.getJob(`task-${task.id}`);
            if (job) {
                const [state, { logs }] = await Promise.all([job.getState(), taskQueue.getJobLogs(job.id, -20, -1)]);
                execution[task.id] = { state, messages: logs };
            } else execution[task.id] = { state: "missing", messages: [] };
        } catch {
            execution[task.id] = { state: "unavailable", messages: [] };
        }
    }));
    res.json({ conversation, execution });
}

export async function sendMessage(req, res) {
    const id = validId(req.params.conversationId);
    const content = messageText(req.body.content);
    const mode = req.body.mode === "code" ? "code" : req.body.mode === "chat" || req.body.mode == null ? "chat" : null;
    if (!id || !content || content.length > 20_000 || !mode) {
        return res.status(400).json({ error: "Provide a message of at most 20,000 characters and a valid mode." });
    }
    const conversation = await prisma.conversation.findFirst({
        where: { id, userId: req.user.userId },
        include: { repository: { select: repositorySelect } }
    });
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
    if (!conversation.repository) return res.status(409).json({ error: "This conversation's repository is no longer available." });

    try {
        const created = await prisma.$transaction(async (tx) => {
            const pending = await tx.message.findFirst({ where: { conversationId: id, role: "assistant", status: "pending" } });
            if (pending) return null;
            const priorMessages = await tx.message.count({ where: { conversationId: id } });
            const userMessage = await tx.message.create({ data: { conversationId: id, role: "user", content, mode } });
            const task = mode === "code" ? await tx.task.create({
                data: {
                    userId: req.user.userId,
                    repositoryId: conversation.repositoryId,
                    conversationId: id,
                    status: "pending",
                    conversation: { create: { query: content, response: "" } }
                },
                include: { conversation: true }
            }) : null;
            const assistantMessage = await tx.message.create({
                data: { conversationId: id, role: "assistant", content: "", mode, status: "pending", taskId: task?.id }
            });
            await tx.conversation.update({
                where: { id },
                data: { updatedAt: new Date(), ...(priorMessages === 0 ? { title: content.slice(0, 80) } : {}) }
            });
            return { userMessage, assistantMessage, task };
        });
        if (!created) return res.status(409).json({ error: "Wait for the current response before sending another message." });
        const jobId = created.task ? `task-${created.task.id}` : `chat-${created.assistantMessage.id}`;
        try {
            await taskQueue.add(created.task ? "agent-task" : "agent-chat", {
                conversationId: id,
                userId: req.user.userId,
                repositoryId: conversation.repositoryId,
                query: content,
                assistantMessageId: created.assistantMessage.id,
                ...(created.task ? { taskId: created.task.id, queryId: created.task.conversation[0].id } : {})
            }, { jobId, removeOnComplete: true, removeOnFail: 100 });
        } catch (error) {
            await prisma.message.update({ where: { id: created.assistantMessage.id }, data: { content: `Could not queue the request: ${error.message}`, status: "failed" } });
            if (created.task) await prisma.task.update({ where: { id: created.task.id }, data: { status: "failed" } });
            return res.status(503).json({ error: "Could not queue the request." });
        }
        return res.status(201).json(created);
    } catch (error) {
        if (error.code === "P2002") return res.status(409).json({ error: "Wait for the current response before sending another message." });
        console.error("Could not send conversation message:", error);
        return res.status(500).json({ error: "Could not send message." });
    }
}
