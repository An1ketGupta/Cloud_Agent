import { authApi } from './authApi.js';
import { request } from './client.js';

export async function withSession(path, options) {
  try {
    return await request(path, options);
  } catch (error) {
    if (error.status !== 401) throw error;
    await authApi.refresh();
    return request(path, options);
  }
}
