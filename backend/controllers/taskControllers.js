import { prisma } from "../clients/prismaClient.js"
import { taskQueue } from "../queues/taskQueue.js";

export async function NewTask(req, res) {
    try {
        const user = req.user;
        const { query } = req.body;
        if (!query || typeof query !== "string" || query.trim() === "") {
            return res.status(400).json({
                success: false,
                error: "Query is required",
            });
        }

        const task = await prisma.task.create({
            data: {
                userId: user.userId,
                status: 'pending',
                conversation: {
                    create: {
                        query: query.trim(),
                        response: "",
                    },
                },
            },
            include: {
                conversation: true,
            },
        });

        await taskQueue.add(
                "agent-task", {
                taskId: task.id,
                conversation : task.conversation
            }
        )

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


export async function continueTask(req, res) {

}