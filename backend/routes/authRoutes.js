import express from "express";
import { signin, signout, signup } from "../controllers/authControllers.js";
import { refreshAuthAccessToken } from "../services/refreshAuthAccessToken.js";

export const authRouter = express.Router();

authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.post("/refresh", refreshAuthAccessToken);
authRouter.post("/signout", signout);
