import express from "express";
import { AuthMiddleWare } from "../services/authMiddleware.js";
import { createConversation, getConversation, listConversations, sendMessage } from "../controllers/conversationControllers.js";

export const conversationRouter = express.Router();
conversationRouter.use(AuthMiddleWare);
conversationRouter.get("/", listConversations);
conversationRouter.post("/", createConversation);
conversationRouter.get("/:conversationId", getConversation);
conversationRouter.post("/:conversationId/messages", sendMessage);
