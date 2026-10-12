import { useWorkspace } from '../../hooks/useWorkspace.js';
import HomePage from '../../pages/HomePage.jsx';
import ConversationsPage from '../../pages/ConversationsPage.jsx';
import ConversationPage from '../../pages/ConversationPage.jsx';
import RepositoriesPage from '../../pages/RepositoriesPage.jsx';
import AccountPage from '../../pages/AccountPage.jsx';
import WorkspaceLayout from './WorkspaceLayout.jsx';

export default function ConversationWorkspace({
  initialUser,
  onSignOut,
  signingOut,
  accountError,
}) {
  const {
    user, view, conversations, activeId, sidebarOpen, setSidebarOpen,
    navigate, openConversation, newConversation, error, setError,
    prompt, setPrompt, send, busy, mode, setMode,
    repositories, repositoryId, setRepositoryId, syncing, syncRepositories,
    conversation, execution, reviewFile, reviewingFile, pending,
  } = useWorkspace(initialUser);
  const composerProps = {
    value: prompt,
    onChange: setPrompt,
    onSend: send,
    busy,
    mode,
    onModeChange: setMode,
  };

  function selectTemplate(template) {
    setPrompt(template.prompt);
    setMode(template.mode);
  }

  function selectRepository(id) {
    setRepositoryId(String(id));
    navigate('home');
  }

  return (
    <WorkspaceLayout
      user={user}
      view={view}
      conversations={conversations}
      activeId={activeId}
      sidebarOpen={sidebarOpen}
      onOpenSidebar={() => setSidebarOpen(true)}
      onCloseSidebar={() => setSidebarOpen(false)}
      onNewConversation={newConversation}
      navigate={navigate}
      openConversation={openConversation}
      error={error || accountError}
      onDismissError={() => setError('')}
    >
      {view === 'home' && (
        <HomePage
          user={user}
          composerProps={composerProps}
          repositoryId={repositoryId}
          onRepositoryChange={setRepositoryId}
          repositories={repositories}
          onTemplateSelect={selectTemplate}
        />
      )}
      {view === 'conversations' && (
        <ConversationsPage
          conversations={conversations}
          navigate={navigate}
          openConversation={openConversation}
        />
      )}
      {view === 'conversation' && (
        <ConversationPage
          conversation={conversation}
          execution={execution}
          navigate={navigate}
          reviewFile={reviewFile}
          reviewingFile={reviewingFile}
          pending={pending}
          composerProps={composerProps}
        />
      )}
      {view === 'repositories' && (
        <RepositoriesPage
          repositories={repositories}
          syncing={syncing}
          syncRepositories={syncRepositories}
          onSelectRepository={selectRepository}
        />
      )}
      {view === 'account' && (
        <AccountPage user={user} onSignOut={onSignOut} signingOut={signingOut} />
      )}
    </WorkspaceLayout>
  );
}
