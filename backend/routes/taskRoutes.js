import express from 'express'
import { continueTask, NewTask } from '../controllers/taskControllers.js';
import { AuthMiddleWare } from '../services/authMiddleware.js';

export const taskRouter = express.Router();

taskRouter.post("/new",AuthMiddleWare , NewTask)
taskRouter.post("/continue",AuthMiddleWare, continueTask)