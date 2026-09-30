import express from 'express';
import 'dotenv/config'
import { authRouter } from './routes/authRoutes.js';
import { githubRouter } from './routes/githubRoutes.js';
import cookieParser from 'cookie-parser';
import { myRouter } from './routes/myRoutes.js';
import { taskRouter } from './routes/taskRoutes.js';
import { QueueEvents } from 'bullmq';
import { logTask } from './services/taskLogger.js';
import './workers/taskWorker.js';

const taskEvents = new QueueEvents('task-queue', {
    connection: { host: 'localhost', port: 6379 }
});
const taskIdFromJobId = (jobId) => String(jobId).replace(/^task-/, '');

taskEvents.on('progress', ({ jobId, data }) => {
    logTask(taskIdFromJobId(jobId), data);
});
taskEvents.on('completed', ({ jobId }) => {
    logTask(taskIdFromJobId(jobId), 'Repository container is ready.');
});
taskEvents.on('failed', ({ jobId, failedReason }) => {
    logTask(taskIdFromJobId(jobId), `Job failed: ${failedReason}`);
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

app.listen(3000, ()=>{
    console.log("App is listening on port 3000")
})
