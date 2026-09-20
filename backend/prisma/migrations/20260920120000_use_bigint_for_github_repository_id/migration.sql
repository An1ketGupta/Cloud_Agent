-- GitHub repository IDs are not constrained to PostgreSQL's 32-bit INTEGER range.
ALTER TABLE "GithubRepository"
ALTER COLUMN "githubRepoId" TYPE BIGINT;
