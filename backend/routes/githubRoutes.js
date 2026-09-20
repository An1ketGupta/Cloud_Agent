import express from "express";
import { AuthorizeGithub, getGithubAccessToken } from "../controllers/githubAuthControllers.js";
import { AuthMiddleWare } from "../services/authMiddleware.js";

export const githubRouter = express.Router();

githubRouter.get("/", AuthMiddleWare , AuthorizeGithub)
githubRouter.get("/callback", AuthMiddleWare, getGithubAccessToken)