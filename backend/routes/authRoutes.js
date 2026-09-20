import express from "express";
import { signin, signup } from "../controllers/authControllers.js";
import { refreshAuthAccessToken } from "../services/refreshAuthAccessToken.js";

export const authRouter = express.Router();

authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.get("/refresh", refreshAuthAccessToken)
// authRouter.post('/refresh', refresh);