import { authApi, request } from './authApi';

async function withSession(path, options) {
  try {
    return await request(path, options);
  } catch (error) {
    if (error.status !== 401) throw error;
    await authApi.refresh();
    return request(path, options);
  }
}

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
