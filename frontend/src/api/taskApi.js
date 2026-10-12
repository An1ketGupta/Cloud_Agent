import { withSession } from './sessionRequest.js';

export const taskApi = {
  list() { return withSession('/task/'); },
  get(id) { return withSession(`/task/${id}`); },
  create(repositoryId, query) {
    return withSession('/task/new', {
      method: 'POST',
      body: JSON.stringify({ repositoryId, query }),
    });
  },
  syncRepositories() {
    return withSession('/auth/github/sync', { method: 'POST' });
  },
};
