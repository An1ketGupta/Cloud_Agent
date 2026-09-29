export function logTask(taskId, message) {
    console.log(`${new Date().toISOString()} [task ${taskId}] ${message}`);
}
