import { useEffect, useState } from 'react';
import { authApi } from '../api/authApi.js';
import { conversationApi } from '../api/conversationApi.js';

export function useRepositories(initialUser, onError) {
  const [user, setUser] = useState(initialUser);
  const [repositoryId, setRepositoryId] = useState(
    String(initialUser.githubAccount?.repositories[0]?.id || '')
  );
  const [syncing, setSyncing] = useState(false);
  const repositories = user.githubAccount?.repositories || [];

  useEffect(() => {
    if (!user.githubAccount || repositories.length) return;
    let stopped = false;
    let loading = false;

    async function update() {
      if (loading) return;
      loading = true;
      try {
        const { user: profile } = await authApi.getProfile();
        if (!stopped) {
          setUser(profile);
          setRepositoryId((current) => current || String(profile.githubAccount?.repositories[0]?.id || ''));
        }
      } catch {
        // Retry while GitHub repository discovery completes.
      } finally {
        loading = false;
      }
    }

    const timer = setInterval(update, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [user.githubAccount, repositories.length]);

  async function syncRepositories() {
    setSyncing(true);
    onError('');
    try {
      await conversationApi.syncRepositories();
      const { user: profile } = await authApi.getProfile();
      setUser(profile);
      setRepositoryId((current) => current || String(profile.githubAccount?.repositories[0]?.id || ''));
    } catch (error) {
      onError(error.message);
    } finally {
      setSyncing(false);
    }
  }

  return { user, repositories, repositoryId, setRepositoryId, syncing, syncRepositories };
}
