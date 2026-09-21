-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'runnning', 'completed');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'pending';
