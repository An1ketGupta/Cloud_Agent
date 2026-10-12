import { useEffect, useState } from 'react';
import { conversationApi } from '../api/conversationApi.js';

export function useConversationList(onError) {
  const [conversations, setConversations] = useState([]);

  async function refreshList() {
    const { conversations: items } = await conversationApi.list();
    setConversations(items);
  }

  useEffect(() => {
    let stopped = false;
    let loading = false;

    async function update() {
      if (loading) return;
      loading = true;
      try {
        const { conversations: items } = await conversationApi.list();
        if (!stopped) setConversations(items);
      } catch (error) {
        if (!stopped) onError(error.message);
      } finally {
        loading = false;
      }
    }

    update();
    const timer = setInterval(update, 8000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [onError]);

  return { conversations, refreshList };
}
