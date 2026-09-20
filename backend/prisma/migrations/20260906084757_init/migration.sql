-- CreateTable
CREATE TABLE "User" (
    "userId" SERIAL NOT NULL,
    "github_access_token" TEXT NOT NULL,
    "github_refresh_token" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);
