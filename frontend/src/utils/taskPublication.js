export function taskResult(task) {
  try {
    return JSON.parse(task.conversation?.[0]?.response || 'null');
  } catch {
    return null;
  }
}

export function publicationState(conversation) {
  const tasks = conversation?.tasks || [];
  return {
    latestTaskId: Math.max(0, ...tasks.map((task) => task.id)),
    publicationBusy: tasks.some((task) => taskResult(task)?.pullRequest?.status === 'creating'),
  };
}

export function recordPullRequest(data, conversationId, taskId, pullRequest) {
  if (data?.conversation?.id !== conversationId) return data;
  return {
    ...data,
    conversation: {
      ...data.conversation,
      tasks: data.conversation.tasks.map((task) => {
        if (task.id !== taskId || !task.conversation?.[0]) return task;
        const [query, ...queries] = task.conversation;
        return {
          ...task,
          conversation: [
            { ...query, response: JSON.stringify({ ...taskResult(task), pullRequest }) },
            ...queries,
          ],
        };
      }),
    },
  };
}
