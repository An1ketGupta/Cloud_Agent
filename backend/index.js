import express from 'express';
import 'dotenv/config'
import { authRouter } from './routes/authRoutes.js';
import { githubRouter } from './routes/githubRoutes.js';
import cookieParser from 'cookie-parser';
import { myRouter } from './routes/myRoutes.js';
import { taskRouter } from './routes/taskRoutes.js';
import { conversationRouter } from './routes/conversationRoutes.js';
import { QueueEvents } from 'bullmq';
import { logTask } from './services/taskLogger.js';
import './workers/taskWorker.js';
import { startIdleConversationCleanup } from './services/idleConversationContainers.js';

const taskEvents = new QueueEvents('task-queue', {
    connection: { host: 'localhost', port: 6379 }
});
const taskIdFromJobId = (jobId) => String(jobId).startsWith('task-') ? String(jobId).slice(5) : null;

taskEvents.on('progress', ({ jobId, data }) => {
    const taskId = taskIdFromJobId(jobId);
    if (taskId) logTask(taskId, data);
});
taskEvents.on('completed', ({ jobId }) => {
    const taskId = taskIdFromJobId(jobId);
    if (taskId) logTask(taskId, 'Repository container is ready.');
});
taskEvents.on('failed', ({ jobId, failedReason }) => {
    const taskId = taskIdFromJobId(jobId);
    if (taskId) logTask(taskId, `Job failed: ${failedReason}`);
});
taskEvents.on('error', (error) => {
    console.error('Task progress listener error:', error);
});

const app = express();
app.use(express.json())
app.use(cookieParser())

app.use('/auth', authRouter)
app.use('/auth/github', githubRouter)
app.use('/me', myRouter)
app.use('/task', taskRouter)
app.use('/conversations', conversationRouter)

app.listen(3000, ()=>{
    console.log("App is listening on port 3000")
})
startIdleConversationCleanup();
