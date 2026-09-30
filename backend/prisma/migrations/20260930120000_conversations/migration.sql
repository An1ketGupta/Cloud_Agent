CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');
CREATE TYPE "MessageMode" AS ENUM ('chat', 'code');
CREATE TYPE "MessageStatus" AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "repositoryId" INTEGER,
    "title" TEXT NOT NULL,
    "containerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "mode" "MessageMode" NOT NULL DEFAULT 'chat',
    "taskId" INTEGER,
    "status" "MessageStatus" NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN "conversationId" INTEGER;

CREATE INDEX "Conversation_userId_updatedAt_idx" ON "Conversation"("userId", "updatedAt");
CREATE INDEX "Message_conversationId_id_idx" ON "Message"("conversationId", "id");
CREATE UNIQUE INDEX "Message_one_pending_response_per_conversation" ON "Message"("conversationId") WHERE "role" = 'assistant' AND "status" = 'pending';
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GithubRepository"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Conversation" ("userId", "repositoryId", "title", "createdAt", "updatedAt")
SELECT t."userId", t."repositoryId", COALESCE(NULLIF(LEFT(q."query", 80), ''), 'Previous task'), t."createdAt", t."createdAt"
FROM "Task" t
LEFT JOIN LATERAL (SELECT "query" FROM "query" WHERE "taskId" = t."id" ORDER BY "id" LIMIT 1) q ON TRUE
ORDER BY t."id";

WITH ranked_tasks AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") AS row_number FROM "Task"
), ranked_conversations AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "id") AS row_number FROM "Conversation"
)
UPDATE "Task" t SET "conversationId" = c."id"
FROM ranked_tasks r JOIN ranked_conversations c ON c.row_number = r.row_number
WHERE t."id" = r."id";

INSERT INTO "Message" ("conversationId", "role", "content", "mode", "taskId", "createdAt")
SELECT t."conversationId", 'user', q."query", 'code', t."id", t."createdAt"
FROM "Task" t JOIN "query" q ON q."taskId" = t."id";

INSERT INTO "Message" ("conversationId", "role", "content", "mode", "taskId", "status", "createdAt")
SELECT t."conversationId", 'assistant',
    CASE WHEN t."status" = 'completed' THEN 'Previous code run completed. Open the run details below to review its result.'
         WHEN t."status" = 'failed' THEN 'Previous code run failed. Open the run details below to review its result.'
         ELSE 'Previous code run is in progress.' END,
    'code', t."id",
    CASE WHEN t."status" = 'completed' THEN 'completed'::"MessageStatus"
         WHEN t."status" = 'failed' THEN 'failed'::"MessageStatus"
         ELSE 'pending'::"MessageStatus" END,
    t."createdAt"
FROM "Task" t;
