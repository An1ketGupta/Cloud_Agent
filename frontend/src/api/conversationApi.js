import { withSession } from './sessionRequest.js';

export const conversationApi = {
  list() {
    return withSession('/conversations/');
  },
  get(id) {
    return withSession(`/conversations/${id}`);
  },
  create(repositoryId) {
    return withSession('/conversations/',
      {
        method: 'POST', body: JSON.stringify({ repositoryId })
      });
  },
  send(id, content, mode) {
    return withSession(`/conversations/${id}/messages`,
      {
        method: 'POST', body: JSON.stringify({ content, mode })
      });
  },
  reviewFile(id, taskId, path, decision) {
    return withSession(`/conversations/${id}/tasks/${taskId}/files/review`,
      {
        method: 'POST', body: JSON.stringify({ path, decision })
      });
  },
  pullRequestOptions(id, taskId) {
    return withSession(`/conversations/${id}/tasks/${taskId}/pull-request`);
  },
  createPullRequest(id, taskId, details) {
    return withSession(`/conversations/${id}/tasks/${taskId}/pull-request`,
      {
        method: 'POST', body: JSON.stringify(details)
      });
  },
  syncRepositories() {
    return withSession('/auth/github/sync', { method: 'POST' });
  },
};
