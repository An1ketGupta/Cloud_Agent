/*
  Warnings:

  - You are about to drop the column `github_access_token` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `github_refresh_token` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "github_access_token",
DROP COLUMN "github_refresh_token";

-- CreateTable
CREATE TABLE "GithubAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "githubUserId" BIGINT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "githubAvatarUrl" TEXT,
    "githubAccessToken" TEXT NOT NULL,
    "githubRefreshToken" TEXT NOT NULL,

    CONSTRAINT "GithubAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubRepository" (
    "id" SERIAL NOT NULL,
    "githubAccountId" INTEGER NOT NULL,
    "githubRepoId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "private" BOOLEAN NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "cloneUrl" TEXT,
    "defaultBranch" TEXT,

    CONSTRAINT "GithubRepository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubAccount_userId_key" ON "GithubAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubAccount_githubUserId_key" ON "GithubAccount"("githubUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubRepository_githubAccountId_githubRepoId_key" ON "GithubRepository"("githubAccountId", "githubRepoId");

-- AddForeignKey
ALTER TABLE "GithubAccount" ADD CONSTRAINT "GithubAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubRepository" ADD CONSTRAINT "GithubRepository_githubAccountId_fkey" FOREIGN KEY ("githubAccountId") REFERENCES "GithubAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
