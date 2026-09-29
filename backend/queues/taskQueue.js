import { Queue } from 'bullmq'

const connection = {
    host: 'localhost',
    port : 6379,
    maxRetriesPerRequest: 1
}

export const taskQueue = new Queue("task-queue", {
    connection: connection
});

taskQueue.on('error', (error) => {
    console.error('Task queue Redis error:', error);
});
