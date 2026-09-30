import "dotenv/config";
import { Worker } from "bullmq";
import { processTask } from "../services/processTask.js";
import { processChat } from "../services/processChat.js";

const connection = {
    host: "localhost",
    port: 6379
}

const taskWorker = new Worker("task-queue", (job) => job.name === "agent-chat" ? processChat(job) : processTask(job), { connection });

taskWorker.on("error", (error) => {
    console.error("Task worker Redis error:", error);
});

taskWorker.on("ready", () => {
    console.log(`${new Date().toISOString()} Task worker ready; waiting for jobs.`);
});
