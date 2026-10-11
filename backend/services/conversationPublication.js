// Serialize short workspace mutations across API processes, without holding a
// database transaction open while talking to GitHub or Docker.
export async function lockConversation(tx, conversationId) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(7321, ${conversationId}::integer)`;
}

export const PUBLICATION_LEASE_MS = 10 * 60_000;

export function publicationActive(publication) {
    return publication?.status === "creating" &&
        Date.now() - Date.parse(publication.startedAt) < PUBLICATION_LEASE_MS;
}

export async function assertNoPublication(tx, conversationId) {
    const queries = await tx.query.findMany({
        where: { task: { conversationId } }, select: { response: true }
    });
    if (queries.some(({ response }) => {
        try { return publicationActive(JSON.parse(response).pullRequest); } catch { return false; }
    })) {
        const error = new Error("Wait for the pull request to finish publishing.");
        error.status = 409;
        throw error;
    }
}
