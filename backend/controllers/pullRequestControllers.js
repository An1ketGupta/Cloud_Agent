import { prisma } from "../clients/prismaClient.js";
import { getConversationContainer } from "../services/conversationContainer.js";
import { createPullRequestHandlers } from "../services/pullRequestWorkflow.js";

const handlers = createPullRequestHandlers({ db: prisma, getContainer: getConversationContainer });
export const getPullRequestOptions = handlers.options;
export const createTaskPullRequest = handlers.create;
