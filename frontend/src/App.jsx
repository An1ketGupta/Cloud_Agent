import { useAuth } from './hooks/useAuth.js';
import AuthPage from './pages/AuthPage.jsx';
import ConversationWorkspace from './components/layout/ConversationWorkspace.jsx';
import WorkspaceLoading from './components/common/WorkspaceLoading.jsx';

export default function App() {
  const { user, loading, mode, busy, error, notice, changeMode, submit, signOut } = useAuth();

  if (loading) return <WorkspaceLoading />;
  if (user) {
    return (
      <ConversationWorkspace
        initialUser={user}
        onSignOut={signOut}
        signingOut={busy}
        accountError={error}
      />
    );
  }

  return (
    <AuthPage
      mode={mode}
      onModeChange={changeMode}
      onSubmit={submit}
      busy={busy}
      error={error}
      notice={notice}
    />
  );
}
