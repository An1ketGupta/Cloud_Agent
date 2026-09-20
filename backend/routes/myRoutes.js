import express from 'express'
import { MyProfile } from '../controllers/profileControllers.js';
import { AuthMiddleWare } from '../services/authMiddleware.js';

export const myRouter = express.Router();

myRouter.get('/', AuthMiddleWare , MyProfile)