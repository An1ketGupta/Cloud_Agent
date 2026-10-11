import express from 'express';
import 'dotenv/config'
import { authRouter } from './routes/authRoutes.js';
import { githubRouter } from './routes/githubRoutes.js';
import cookieParser from 'cookie-parser';
import { myRouter } from './routes/myRoutes.js';
import { conversationRouter } from './routes/conversationRoutes.js';
import './workers/taskWorker.js';
import { startIdleConversationCleanup } from './services/idleConversationContainers.js';

const app = express();
app.use(express.json({ limit: "512kb" }))
app.use(cookieParser())

app.use('/auth', authRouter)
app.use('/auth/github', githubRouter)
app.use('/me', myRouter)
app.use('/conversations', conversationRouter)

app.listen(3000, ()=>{
    console.log("App is listening on port 3000")
})
startIdleConversationCleanup();
