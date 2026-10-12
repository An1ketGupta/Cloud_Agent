import { useEffect, useState } from 'react';
import { conversationApi } from '../api/conversationApi.js';

export function useActiveConversation(activeId, enabled, onError) {
  const [data, setData] = useState(null);

  async function refreshConversation(id) {
    const next = await conversationApi.get(id);
    setData(next);
    return next;
  }

  useEffect(() => {
    if (!activeId || !enabled) return;
    let stopped = false;
    let loading = false;

    async function update() {
      if (loading) return;
      loading = true;
      try {
        const next = await conversationApi.get(activeId);
        if (!stopped) setData(next);
      } catch (error) {
        if (!stopped) onError(error.message);
      } finally {
        loading = false;
      }
    }

    update();
    const timer = setInterval(update, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [activeId, enabled, onError]);

  return {
    conversation: data?.conversation,
    execution: data?.execution,
    refreshConversation,
    resetConversation: () => setData(null),
  };
}
