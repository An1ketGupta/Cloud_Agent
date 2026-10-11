import express from "express";
import { AuthMiddleWare } from "../services/authMiddleware.js";
import { createConversation, getConversation, listConversations, reviewFile, sendMessage } from "../controllers/conversationControllers.js";
import { createTaskPullRequest, getPullRequestOptions } from "../controllers/pullRequestControllers.js";

export const conversationRouter = express.Router();
conversationRouter.use(AuthMiddleWare);
conversationRouter.get("/", listConversations);
conversationRouter.post("/", createConversation);
conversationRouter.get("/:conversationId", getConversation);
conversationRouter.post("/:conversationId/messages", sendMessage);
conversationRouter.post("/:conversationId/tasks/:taskId/files/review", reviewFile);
conversationRouter.get("/:conversationId/tasks/:taskId/pull-request", getPullRequestOptions);
conversationRouter.post("/:conversationId/tasks/:taskId/pull-request", createTaskPullRequest);
