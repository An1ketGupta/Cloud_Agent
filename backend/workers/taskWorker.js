import "dotenv/config";
import { Worker } from "bullmq";
import { runAgentTask } from "../agent/sandbox/agentHandler.js";

const connection = {
    host: "localhost",
    port: 6379
}

const taskWorker = new Worker("task-queue", 
    async (job) => {
        const response = await runAgentTask(job.data, job.id)
        return response
    },
    {
        connection
    }
)
