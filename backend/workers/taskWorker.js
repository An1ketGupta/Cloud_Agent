import "dotenv/config";
import { Worker } from "bullmq";
import { processTask } from "../services/processTask.js";

const connection = {
    host: "localhost",
    port: 6379
}

const taskWorker = new Worker("task-queue", processTask, { connection });

taskWorker.on("error", (error) => {
    console.error("Task worker Redis error:", error);
});

taskWorker.on("ready", () => {
    console.log(`${new Date().toISOString()} Task worker ready; waiting for jobs.`);
});
