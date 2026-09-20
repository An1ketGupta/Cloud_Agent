import axios from "axios";
import { Prisma } from "../generated/prisma/client.ts";
import { prisma } from "../clients/prismaClient.js";

const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_PAGE_SIZE = 100;
const UPSERT_BATCH_SIZE = 500;

const activeSyncs = new Map();

function githubHeaders(accessToken) {
    return {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION
    };
}

export async function fetchGithubRepositories(accessToken) {
    const repositories = [];

    for (let page = 1; ; page += 1) {
        const response = await axios.get("https://api.github.com/user/repos", {
            headers: githubHeaders(accessToken),
            params: {
                per_page: GITHUB_PAGE_SIZE,
                page
            }
        });

        repositories.push(...response.data);

        if (response.data.length < GITHUB_PAGE_SIZE) {
            return repositories;
        }
    }
}

export async function upsertGithubRepositories(githubAccountId, repositories) {
    for (let start = 0; start < repositories.length; start += UPSERT_BATCH_SIZE) {
        const batch = repositories.slice(start, start + UPSERT_BATCH_SIZE);
        const rows = batch.map((repository) => Prisma.sql`(
            ${githubAccountId},
            ${BigInt(repository.id)},
            ${repository.name},
            ${repository.full_name},
            ${repository.description},
            ${repository.private},
            ${repository.html_url},
            ${repository.clone_url},
            ${repository.default_branch}
        )`);

        await prisma.$executeRaw(Prisma.sql`
            INSERT INTO "GithubRepository" (
                "githubAccountId",
                "githubRepoId",
                "name",
                "fullName",
                "description",
                "private",
                "htmlUrl",
                "cloneUrl",
                "defaultBranch"
            )
            VALUES ${Prisma.join(rows)}
            ON CONFLICT ("githubAccountId", "githubRepoId")
            DO UPDATE SET
                "name" = EXCLUDED."name",
                "fullName" = EXCLUDED."fullName",
                "description" = EXCLUDED."description",
                "private" = EXCLUDED."private",
                "htmlUrl" = EXCLUDED."htmlUrl",
                "cloneUrl" = EXCLUDED."cloneUrl",
                "defaultBranch" = EXCLUDED."defaultBranch"
        `);
    }

    return repositories.length;
}

export function syncGithubRepositories({ githubAccountId, accessToken }) {
    const currentSync = activeSyncs.get(githubAccountId);
    if (currentSync) {
        return currentSync;
    }

    const sync = fetchGithubRepositories(accessToken)
        .then((repositories) => upsertGithubRepositories(githubAccountId, repositories))
        .finally(() => {
            activeSyncs.delete(githubAccountId);
        });

    activeSyncs.set(githubAccountId, sync);
    return sync;
}

export function startGithubRepositorySync(githubAccount) {
    void syncGithubRepositories({
        githubAccountId: githubAccount.id,
        accessToken: githubAccount.githubAccessToken
    })
        .then((repositoryCount) => {
            console.log(`Synchronized ${repositoryCount} GitHub repositories for account ${githubAccount.id}.`);
        })
        .catch((error) => {
            console.error(`GitHub repository sync failed for account ${githubAccount.id}.`, error);
        });
}
