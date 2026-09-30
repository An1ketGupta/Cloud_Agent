import { prisma } from "../clients/prismaClient.js";

export async function conversationContext(conversationId, db = prisma) {
    const messages = await db.message.findMany({
        where: { conversationId, status: { not: "pending" } },
        orderBy: { id: "desc" },
        take: 20,
        select: { role: true, content: true, mode: true }
    });
    return messages.reverse().map((message) => `${message.role} (${message.mode}): ${message.content}`).join("\n\n").slice(-20_000);
}
