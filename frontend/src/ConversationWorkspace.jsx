import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import { conversationApi } from './api/conversationApi';
import GitDiffViewer from './GitDiffViewer';

function RunDetails({ task, execution, onFileDecision, reviewingFile }) {
  let result;
  try { result = JSON.parse(task.conversation?.[0]?.response || 'null'); } catch { result = null; }
  const active = task.status === 'pending' || task.status === 'runnning';
  return <details className="run-details" open={active}>
    <summary>Code run #{task.id} · {task.status === 'runnning' ? 'running' : task.status}</summary>
    {active && <div className="run-progress" role="status"><p>{execution?.state === 'missing' ? 'The queue job is missing.' : execution?.state === 'unavailable' ? 'Progress is temporarily unavailable.' : 'The agent is working on this request.'}</p>{execution?.messages?.length > 0 && <ol>{execution.messages.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol>}</div>}
    {result?.review && <p className="run-review">QA: {result.review.decision}{result.review.findings?.length ? ` · ${result.review.findings.map((finding) => finding.issue).join('; ')}` : ''}</p>}
    {(result?.patch || result?.fileReview?.displayPatch) && <GitDiffViewer patch={result.fileReview?.displayPatch || result.patch} fileReview={result.fileReview} onFileDecision={(path, decision) => onFileDecision(task.id, path, decision)} reviewingFile={reviewingFile} />}
    {result?.error && <p className="notice notice-error">{result.error}</p>}
    {!active && !result?.patch && !result?.error && <p className="muted">No patch was saved for this run.</p>}
  </details>;
}

function Composer({ value, onChange, onSend, busy, disabled, mode, onModeChange, repository, onRepositoryChange, repositories, isNew }) {
  function submit(event) { event.preventDefault(); onSend(mode); }
  return <form className="composer conversation-composer" onSubmit={submit}>
    <label className="sr-only" htmlFor="conversation-prompt">Message</label>
    <textarea id="conversation-prompt" value={value} onChange={(event) => onChange(event.target.value)} rows="3" required placeholder="Ask a question, discuss an idea, or describe a change…" onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) event.currentTarget.form?.requestSubmit(); }} />
    <div className="composer-footer">
      {isNew ? <label className="repository-picker"><span className="sr-only">Repository</span><select value={repository} onChange={(event) => onRepositoryChange(event.target.value)} aria-label="Repository" required><option value="">Select repository</option>{repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.fullName}</option>)}</select></label> : <span className="composer-hint">Ctrl + Enter to send</span>}
      <div className="composer-actions"><div className="mode-switch" role="group" aria-label="Conversation mode"><button type="button" className={mode === 'chat' ? 'mode-active' : ''} aria-pressed={mode === 'chat'} onClick={() => onModeChange('chat')}>Ask</button><button type="button" className={mode === 'code' ? 'mode-active' : ''} aria-pressed={mode === 'code'} onClick={() => onModeChange('code')}>Agent</button></div><button type="submit" className="primary-button" disabled={busy || disabled || !value.trim()}>{busy ? 'Working…' : mode === 'code' ? 'Run agent' : 'Ask'}</button></div>
    </div>
  </form>;
}

export default function ConversationWorkspace({ initialUser, onSignOut, signingOut, accountError }) {
  const [user, setUser] = useState(initialUser);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [data, setData] = useState(null);
  const [view, setView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState(String(initialUser.githubAccount?.repositories[0]?.id || ''));
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('code');
  const [reviewingFile, setReviewingFile] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const repositories = user.githubAccount?.repositories || [];
  const conversation = data?.conversation;
  const pending = conversation?.messages?.some((message) => message.role === 'assistant' && message.status === 'pending');
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || user.email?.[0]?.toUpperCase();

  async function refreshList() { const { conversations: items } = await conversationApi.list(); setConversations(items); }
  async function refreshConversation(id) { const next = await conversationApi.get(id); setData(next); return next; }
  useEffect(() => { conversationApi.list().then(({ conversations: items }) => setConversations(items)).catch((requestError) => setError(requestError.message)); const timer = setInterval(() => { refreshList().catch(() => {}); }, 8000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!user.githubAccount || repositories.length) return; const timer = setInterval(() => { authApi.getProfile().then(({ user: profile }) => { setUser(profile); setRepositoryId((current) => current || String(profile.githubAccount?.repositories[0]?.id || '')); }).catch(() => {}); }, 3000); return () => clearInterval(timer); }, [user.githubAccount, repositories.length]);
  useEffect(() => { if (!activeId || view !== 'conversation') return; let stopped = false; async function update() { try { const next = await conversationApi.get(activeId); if (!stopped) setData(next); } catch (requestError) { if (!stopped) setError(requestError.message); } } update(); const timer = setInterval(update, 3000); return () => { stopped = true; clearInterval(timer); }; }, [activeId, view]);
  function navigate(next) { setView(next); setSidebarOpen(false); setError(''); }
  function openConversation(id) { setData(null); setActiveId(id); setPrompt(''); navigate('conversation'); }
  async function syncRepositories() { setSyncing(true); setError(''); try { await conversationApi.syncRepositories(); const { user: profile } = await authApi.getProfile(); setUser(profile); } catch (requestError) { setError(requestError.message); } finally { setSyncing(false); } }
  async function send(mode) {
    const content = prompt.trim();
    if (!content || busy || (view === 'conversation' && pending)) return;
    setBusy(true); setError('');
    try {
      let id = activeId;
      if (view !== 'conversation') {
        const { conversation: created } = await conversationApi.create(Number(repositoryId));
        id = created.id;
        setActiveId(id);
        setView('conversation');
      }
      await conversationApi.send(id, content, mode);
      setPrompt('');
      await Promise.all([refreshConversation(id), refreshList()]);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  async function reviewFile(taskId, path, decision) {
    setReviewingFile(`${taskId}:${path}`); setError('');
    try { await conversationApi.reviewFile(activeId, taskId, path, decision); await refreshConversation(activeId); }
    catch (requestError) { setError(requestError.message); }
    finally { setReviewingFile(''); }
  }

  const tasks = new Map(conversation?.tasks?.map((task) => [task.id, task]) || []);
  return <div className="app-shell">
    <button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>☰</button>
    {sidebarOpen && <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-top"><button className="workspace-switcher" type="button" onClick={() => navigate('account')}><span className="workspace-avatar">{initials}</span><span className="workspace-name">{displayName}</span></button><button className="sidebar-close" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>×</button></div>
      <button className="new-session-button" type="button" onClick={() => { setActiveId(null); setData(null); setPrompt(''); navigate('home'); }}>＋ New conversation</button>
      <nav className="primary-nav" aria-label="Workspace"><button className={view === 'home' ? 'nav-active' : ''} type="button" onClick={() => navigate('home')}>Home</button><button className={view === 'conversations' || view === 'conversation' ? 'nav-active' : ''} type="button" onClick={() => navigate('conversations')}>Conversations</button><button className={view === 'repositories' ? 'nav-active' : ''} type="button" onClick={() => navigate('repositories')}>Repositories</button><button className={view === 'account' ? 'nav-active' : ''} type="button" onClick={() => navigate('account')}>Account</button></nav>
      <div className="sidebar-section-heading"><span>Recent conversations</span></div>
      <div className="sidebar-recent">{conversations.length === 0 ? <p className="sidebar-empty">No conversations yet</p> : conversations.slice(0, 12).map((item) => <button key={item.id} type="button" className={activeId === item.id && view === 'conversation' ? 'recent-active' : ''} onClick={() => openConversation(item.id)} title={item.title}><span>{item.title}</span></button>)}</div>
      <div className="sidebar-bottom"><button className="account-button" type="button" onClick={() => navigate('account')}><span className="account-avatar">{initials}</span><span><strong>{displayName}</strong><small>{user.email}</small></span></button></div>
    </aside>
    <main className={`main-area main-${view}`}>
      {(error || accountError) && <div className="global-alert notice notice-error" role="alert">{error || accountError}</div>}
      {view === 'home' && <div className="home-content"><div className="home-center"><div className="home-heading"><h1>Cloud Agent</h1></div><p className="home-subtitle">Start a conversation about your code.</p>{!user.githubAccount ? <div className="connect-card"><div><h2>Connect your GitHub account</h2><p>Choose a repository to start a conversation.</p></div><a className="primary-button" href="/auth/github/">Connect GitHub</a></div> : <Composer value={prompt} onChange={setPrompt} onSend={send} busy={busy} disabled={!repositoryId} mode={mode} onModeChange={setMode} repository={repositoryId} onRepositoryChange={setRepositoryId} repositories={repositories} isNew />}<p className="home-footnote">Ask discusses your code. Agent edits files and shows each change for review.</p></div></div>}
      {view === 'conversations' && <div className="page-content"><div className="page-heading"><span className="eyebrow">Workspace</span><h1>Conversations</h1><p>Continue a discussion or review previous code runs.</p></div><div className="page-toolbar"><span>{conversations.length} conversations</span><button className="secondary-button" type="button" onClick={() => navigate('home')}>New conversation</button></div>{conversations.length === 0 ? <div className="empty-state"><h2>No conversations yet</h2><p>Choose a repository and send your first message.</p></div> : <div className="session-list">{conversations.map((item) => <button key={item.id} className="session-row" type="button" onClick={() => openConversation(item.id)}><span className="session-row-main"><strong>{item.title}</strong><small>{item.repository?.fullName || 'Repository unavailable'} · {new Date(item.updatedAt).toLocaleString()}</small></span><span className="row-chevron">›</span></button>)}</div>}</div>}
      {view === 'conversation' && <div className="conversation-page"><header className="conversation-header"><button className="back-button" type="button" onClick={() => navigate('conversations')}>← Conversations</button><h1>{conversation?.title || 'Conversation'}</h1><p>{conversation?.repository?.fullName || 'Loading repository…'}</p></header><div className="message-list" aria-live="polite">{!conversation ? <p className="muted">Loading conversation…</p> : conversation.messages.map((message) => <article key={message.id} className={`message message-${message.role}`}><div className="message-label">{message.role === 'user' ? 'You' : 'Cloud Agent'}{message.mode === 'code' ? ' · Agent' : ' · Ask'}</div><p>{message.status === 'pending' ? (message.mode === 'code' ? 'Working on code changes…' : 'Reading the repository…') : message.content}</p>{message.taskId && message.role === 'assistant' && tasks.has(message.taskId) && <RunDetails task={tasks.get(message.taskId)} execution={data.execution?.[message.taskId]} onFileDecision={reviewFile} reviewingFile={reviewingFile} />}</article>)}</div><div className="conversation-compose"><Composer value={prompt} onChange={setPrompt} onSend={send} busy={busy} disabled={pending || !conversation} mode={mode} onModeChange={setMode} /></div></div>}
      {view === 'repositories' && <div className="page-content"><div className="page-heading"><span className="eyebrow">Workspace</span><h1>Repositories</h1><p>Choose a repository when you start a conversation.</p></div><div className="page-toolbar"><span>{repositories.length} repositories</span><button className="secondary-button" type="button" onClick={syncRepositories} disabled={syncing}>{syncing ? 'Refreshing…' : 'Refresh repositories'}</button></div>{repositories.length ? <div className="repository-list">{repositories.map((repo) => <div className="repository-row" key={repo.id}><div><strong>{repo.fullName}</strong></div></div>)}</div> : <p className="muted">No repositories available yet.</p>}</div>}
      {view === 'account' && <div className="page-content"><div className="page-heading"><span className="eyebrow">Settings</span><h1>Your account</h1></div><section className="settings-card"><h2>Profile</h2><p>{displayName} · {user.email}</p></section><section className="settings-card"><h2>GitHub</h2><p>{user.githubAccount ? `Connected as ${user.githubAccount.githubUsername}` : 'Not connected'}</p>{!user.githubAccount && <a className="secondary-button" href="/auth/github/">Connect GitHub</a>}</section><section className="settings-card"><h2>Session</h2><button className="secondary-button" type="button" onClick={onSignOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button></section></div>}
    </main>
  </div>;
}
