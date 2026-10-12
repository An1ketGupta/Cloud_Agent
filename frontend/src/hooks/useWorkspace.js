import { useState } from 'react';
import { conversationApi } from '../api/conversationApi.js';
import { useActiveConversation } from './useActiveConversation.js';
import { useConversationList } from './useConversationList.js';
import { useRepositories } from './useRepositories.js';

export function useWorkspace(initialUser) {
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('code');
  const [reviewingFile, setReviewingFile] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const repositoryState = useRepositories(initialUser, setError);
  const { conversations, refreshList } = useConversationList(setError);
  const { conversation, execution, refreshConversation, resetConversation } =
    useActiveConversation(activeId, view === 'conversation', setError);
  const pending = conversation?.messages?.some(
    (message) => message.role === 'assistant' && message.status === 'pending'
  );

  function navigate(next) {
    setView(next);
    setSidebarOpen(false);
    setError('');
  }

  function openConversation(id) {
    resetConversation();
    setActiveId(id);
    setPrompt('');
    navigate('conversation');
  }

  function newConversation() {
    setActiveId(null);
    resetConversation();
    setPrompt('');
    navigate('home');
  }

  async function send(sendMode) {
    const content = prompt.trim();
    if (!content || busy || (view === 'conversation' && pending)) return;
    setBusy(true);
    setError('');
    try {
      let id = activeId;
      if (view !== 'conversation') {
        const { conversation: created } = await conversationApi.create(Number(repositoryState.repositoryId));
        id = created.id;
        resetConversation();
        setActiveId(id);
        setView('conversation');
      }
      await conversationApi.send(id, content, sendMode);
      setPrompt('');
      await Promise.all([refreshConversation(id), refreshList()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function reviewFile(taskId, path, decision) {
    setReviewingFile(`${taskId}:${path}`);
    setError('');
    try {
      await conversationApi.reviewFile(activeId, taskId, path, decision);
      await refreshConversation(activeId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReviewingFile('');
    }
  }

  return {
    ...repositoryState,
    conversations,
    activeId,
    conversation,
    execution,
    view,
    sidebarOpen,
    setSidebarOpen,
    prompt,
    setPrompt,
    mode,
    setMode,
    reviewingFile,
    busy,
    error,
    setError,
    pending,
    navigate,
    openConversation,
    newConversation,
    send,
    reviewFile,
  };
}
