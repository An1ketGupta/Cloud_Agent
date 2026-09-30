import { authApi, request } from './authApi';

async function withSession(path, options) {
  try { return await request(path, options); }
  catch (error) {
    if (error.status !== 401) throw error;
    await authApi.refresh();
    return request(path, options);
  }
}

export const conversationApi = {
  list() { return withSession('/conversations/'); },
  get(id) { return withSession(`/conversations/${id}`); },
  create(repositoryId) { return withSession('/conversations/', { method: 'POST', body: JSON.stringify({ repositoryId }) }); },
  send(id, content, mode) { return withSession(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ content, mode }) }); },
  reviewFile(id, taskId, path, decision) { return withSession(`/conversations/${id}/tasks/${taskId}/files/review`, { method: 'POST', body: JSON.stringify({ path, decision }) }); },
  syncRepositories() { return withSession('/auth/github/sync', { method: 'POST' }); },
};
