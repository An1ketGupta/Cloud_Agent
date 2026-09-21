import { Worker } from "bullmq";

const connection = {
    host: "localhost",
    port: 6379
}

const taskWorker = new Worker("task-queue", 
    async (job) => {
        console.log(job)
    },
    {
        connection
    }
)