import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import { taskApi } from './api/taskApi';
import GitDiffViewer from './GitDiffViewer';

function Icon({ name, size = 19 }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />, menu: <path d="M4 7h16M4 12h16M4 17h16" />, close: <path d="M5 5l14 14M19 5 5 19" />,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-8h6v8" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, code: <path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 5l-4 14" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, arrow: <path d="M12 19V5m-6 6 6-6 6 6" />,
    chevron: <path d="m7 10 5 5 5-5" />, refresh: <path d="M20 11a8 8 0 0 0-14-5L4 8m0-4v4h4M4 13a8 8 0 0 0 14 5l2-2m0 4v-4h-4" />,
    github: <path d="M9 19c-4 1-4-2-6-2m12 4v-3a3 3 0 0 0-.8-2.2c2.8-.3 5.8-1.3 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.4 4.4 0 0 0-.1-3.2S17.5 2.8 15 4.5a11 11 0 0 0-6 0C6.5 2.8 5.4 3.1 5.4 3.1a4.4 4.4 0 0 0-.1 3.2A4.8 4.8 0 0 0 4 9.6c0 4.9 3 5.9 5.8 6.2A3 3 0 0 0 9 18v3" />,
    logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m4-4 4-4-4-4m4 4H9" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function displayStatus(status, queueState) {
  if (status === 'completed' || status === 'failed') return status;
  if (queueState === 'missing' || queueState === 'failed') return 'needs attention';
  if (queueState === 'active' || status === 'runnning') return 'running';
  if (['waiting', 'delayed', 'prioritized'].includes(queueState)) return 'queued';
  return status || 'pending';
}
function Status({ status, queueState }) { const label = displayStatus(status, queueState); return <span className={`status-pill status-${label.replace(' ', '-')}`}>{label}</span>; }

function AgentOutput({ entry, index }) {
  const output = entry.output || {};
  const files = entry.agent === 'Repository Custodian' ? output.candidateFiles : output.changedFiles;
  return <article className="agent-output"><h3>{index + 1}. {entry.agent}</h3>{output.repositorySummary && <p>{output.repositorySummary}</p>}{output.goal && <p>Goal: {output.goal}</p>}{output.summary && <p>{output.summary}</p>}
    {files?.length > 0 && <div><strong>{entry.agent === 'Repository Custodian' ? 'Selected files' : 'Changed files'}</strong><ul>{files.map((file) => <li key={file}><code>{file}</code></li>)}</ul></div>}
    {output.acceptanceCriteria?.length > 0 && <div><strong>Acceptance criteria</strong><ul>{output.acceptanceCriteria.map((criterion, itemIndex) => <li key={itemIndex}>{criterion}</li>)}</ul></div>}
    {output.tasks?.length > 0 && <div><strong>Assignments</strong><ol>{output.tasks.map((step) => <li key={step.id}><strong>{step.role} ({step.id}):</strong> {step.instructions}<br />Files: {step.files?.join(', ')}{step.dependencies?.length > 0 && <> · After: {step.dependencies.join(', ')}</>}</li>)}</ol></div>}
    <details><summary>Full agent output</summary><pre>{JSON.stringify(output, null, 2)}</pre></details>
  </article>;
}

function TaskDetail({ data }) {
  const task = data?.task, result = data?.result, execution = data?.execution;
  if (!task) return <div className="detail-loading" role="status">Loading session…</div>;
  const status = task.status === 'runnning' ? 'running' : task.status;
  const label = displayStatus(task.status, execution?.state);
  return <div className="detail-content">
    <div className="detail-heading"><div><span className="eyebrow">Session details</span><h1>Session #{task.id}</h1><p>{task.repository?.fullName || result?.repository || 'Repository'} <span className="detail-separator">·</span> {new Date(task.createdAt).toLocaleString()}</p></div><Status status={task.status} queueState={execution?.state} /></div>
    <section className="detail-card"><span className="card-kicker">Your request</span><p className="request-text">{task.conversation?.[0]?.query}</p></section>
    {(status === 'pending' || status === 'running') && <section className="detail-card" role="status" aria-live="polite"><div className="section-title"><span className="activity-dot" /><h2>Agent activity</h2></div><p className="muted">{execution?.state === 'missing' ? 'This task is no longer in the queue. Submit it again to retry.' : execution?.state === 'failed' ? execution.error || 'The queue job failed before the task status could be saved.' : execution?.state === 'unavailable' ? 'Queue progress is temporarily unavailable. Retrying automatically.' : label === 'queued' ? 'Waiting for a worker to pick up this task.' : label === 'running' ? 'The agents are working on this task.' : 'Checking the queue for this task.'}</p>{execution?.messages?.length > 0 && <ol className="activity-list">{execution.messages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ol>}</section>}
    {result?.agentOutputs?.length > 0 && <section className="detail-card"><h2>Agent results</h2><div className="agent-output-list">{result.agentOutputs.map((entry, index) => <AgentOutput key={`${entry.agent}-${index}`} entry={entry} index={index} />)}</div></section>}
    {(status === 'completed' || status === 'failed') && <>{result?.summary && <section className="detail-card"><h2>Summary</h2><p className="long-text">{result.summary}</p></section>}{result?.error && <p className="notice notice-error" role="alert">{result.error}</p>}{result?.review && <section className="detail-card"><h2>QA review <span className="review-decision">{result.review.decision}</span></h2>{result.review.findings?.length ? result.review.findings.map((finding, index) => <p key={index} className="long-text">{finding.file ? `${finding.file}: ` : ''}{finding.issue}</p>) : <p className="muted">No findings recorded.</p>}</section>}{result?.plan && <details className="detail-card plan-card"><summary>Agent plan</summary><p className="long-text">{result.plan.goal}</p><ol>{result.plan.tasks?.map((step) => <li key={step.id}>{step.role}: {step.instructions}</li>)}</ol></details>}<section className="detail-card"><h2>Git diff</h2>{result?.patch ? <GitDiffViewer patch={result.patch} /> : <p className="muted">No patch was saved for this task.</p>}</section>{result?.containerId && <details className="detail-card plan-card"><summary>Execution details</summary><p className="muted">Container: <code>{result.containerId}</code><br />Repository path: <code>{result.repositoryRoot}</code></p></details>}</>}
  </div>;
}

export default function CloudWorkspace({ initialUser, onSignOut, signingOut, accountError }) {
  const [user, setUser] = useState(initialUser);
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [data, setData] = useState(null);
  const [view, setView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState(String(initialUser.githubAccount?.repositories[0]?.id || ''));
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const repositories = user.githubAccount?.repositories || [];
  const taskStatus = data?.task?.status;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || user.email?.[0]?.toUpperCase();

  async function loadProfile() { const { user: profile } = await authApi.getProfile(); setUser(profile); setRepositoryId((current) => current || String(profile.githubAccount?.repositories[0]?.id || '')); }
  async function loadTasks() { const { tasks: recent } = await taskApi.list(); setTasks(recent); }
  useEffect(() => { taskApi.list().then(({ tasks: recent }) => setTasks(recent)).catch((requestError) => setError(requestError.message)); const timer = setInterval(() => { taskApi.list().then(({ tasks: recent }) => setTasks(recent)).catch(() => {}); }, 8000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!user.githubAccount || repositories.length > 0) return; const timer = setInterval(() => { authApi.getProfile().then(({ user: profile }) => { setUser(profile); setRepositoryId((current) => current || String(profile.githubAccount?.repositories[0]?.id || '')); }).catch(() => {}); }, 3000); return () => clearInterval(timer); }, [user.githubAccount, repositories.length]);
  useEffect(() => { if (!activeId || view !== 'detail') return; let stopped = false; async function update() { try { const next = await taskApi.get(activeId); if (stopped) return; setData(next); setTasks((current) => current.map((item) => item.id === next.task.id ? { ...item, status: next.task.status } : item)); } catch (requestError) { if (!stopped) setError(requestError.message); } } update(); if (taskStatus === 'completed' || taskStatus === 'failed') return () => { stopped = true; }; const timer = setInterval(update, 2500); return () => { stopped = true; clearInterval(timer); }; }, [activeId, view, taskStatus]);
  function navigate(nextView) { setView(nextView); setSidebarOpen(false); setError(''); }
  function openTask(id) { setData(null); setActiveId(id); navigate('detail'); }
  async function syncRepositories() { setError(''); setSyncing(true); try { await taskApi.syncRepositories(); await loadProfile(); setTimeout(() => { loadProfile().catch(() => {}); }, 2000); } catch (requestError) { setError(requestError.message); } finally { setSyncing(false); } }
  async function submitTask(event) { event.preventDefault(); setBusy(true); setError(''); try { const { task: created } = await taskApi.create(Number(repositoryId), prompt.trim()); setPrompt(''); setData(null); setActiveId(created.id); setView('detail'); await loadTasks(); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }

  return <div className="app-shell">
    <button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>{sidebarOpen && <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation"><div className="sidebar-top"><button type="button" className="workspace-switcher" onClick={() => navigate('account')} title="Account settings"><span className="workspace-avatar">{initials}</span><span className="workspace-name">{displayName}</span><Icon name="chevron" size={15} /></button><button className="sidebar-close" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><Icon name="close" /></button></div><button className="new-session-button" type="button" onClick={() => navigate('home')}><Icon name="plus" size={21} /> New session</button>
      <nav className="primary-nav" aria-label="Workspace"><button type="button" className={view === 'home' ? 'nav-active' : ''} onClick={() => navigate('home')}><Icon name="home" /> Home</button><button type="button" className={view === 'sessions' || view === 'detail' ? 'nav-active' : ''} onClick={() => navigate('sessions')}><Icon name="clock" /> Sessions</button><button type="button" className={view === 'repositories' ? 'nav-active' : ''} onClick={() => navigate('repositories')}><Icon name="code" /> Repositories</button><button type="button" className={view === 'account' ? 'nav-active' : ''} onClick={() => navigate('account')}><Icon name="user" /> Account</button></nav>
      <div className="sidebar-section-heading"><span>Recent sessions</span><button type="button" aria-label="New session" title="New session" onClick={() => navigate('home')}><Icon name="plus" size={18} /></button></div><div className="sidebar-recent">{tasks.length === 0 ? <p className="sidebar-empty">No sessions yet</p> : tasks.slice(0, 8).map((item) => <button key={item.id} type="button" className={view === 'detail' && item.id === activeId ? 'recent-active' : ''} onClick={() => openTask(item.id)} title={item.prompt}><Icon name="clock" size={16} /><span>{item.prompt || `Session #${item.id}`}</span></button>)}</div><div className="sidebar-bottom"><button type="button" className="account-button" onClick={() => navigate('account')}><span className="account-avatar">{initials}</span><span><strong>{displayName}</strong><small>{user.email}</small></span><Icon name="chevron" size={15} /></button></div>
    </aside>
    <main className={`main-area main-${view}`}>
      {(error || accountError) && <div className="global-alert notice notice-error" role="alert">{error || accountError}</div>}
      {view === 'home' && <div className="home-content"><div className="home-center"><div className="home-heading"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><h1>Cloud Agent</h1></div><p className="home-subtitle">What would you like to build?</p>{!user.githubAccount ? <div className="connect-card"><span className="connect-icon"><Icon name="github" size={23} /></span><div><h2>Connect your GitHub account</h2><p>Connect GitHub to choose a repository and start a session.</p></div><a className="primary-button" href="/auth/github/">Connect GitHub</a></div> : <form className="composer" onSubmit={submitTask}><label className="sr-only" htmlFor="task-prompt">Describe your task</label><textarea id="task-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows="3" required placeholder="Ask Cloud Agent to build a feature, fix a bug, or work on your code" onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit(); }} /><div className="composer-footer"><label className="repository-picker"><Icon name="code" size={17} /><span className="sr-only">Repository</span><select value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)} required aria-label="Repository"><option value="">{repositories.length ? 'Select repository' : 'Repositories syncing…'}</option>{repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.fullName}</option>)}</select><Icon name="chevron" size={15} /></label><div className="composer-actions"><span className="composer-hint">Ctrl + Enter</span><button type="submit" className="send-button" disabled={busy || !repositoryId || !prompt.trim()} aria-label={busy ? 'Starting session' : 'Start session'} title="Start session"><Icon name="arrow" size={19} /></button></div></div></form>}<p className="home-footnote">Your agent works directly with the repository you select.</p></div></div>}
      {view === 'sessions' && <div className="page-content"><div className="page-heading"><span className="eyebrow">Workspace</span><h1>Sessions</h1><p>Follow your agent’s work and review completed changes.</p></div><div className="page-toolbar"><span>{tasks.length} {tasks.length === 1 ? 'session' : 'sessions'}</span><button className="secondary-button" type="button" onClick={() => navigate('home')}><Icon name="plus" size={17} /> New session</button></div>{tasks.length === 0 ? <div className="empty-state"><Icon name="clock" size={28} /><h2>No sessions yet</h2><p>Start a session to see your agent’s work here.</p><button className="primary-button" type="button" onClick={() => navigate('home')}>Start a session</button></div> : <div className="session-list">{tasks.map((item) => <button key={item.id} type="button" className="session-row" onClick={() => openTask(item.id)}><span className="session-row-icon"><Icon name="code" size={18} /></span><span className="session-row-main"><strong>{item.prompt || `Session #${item.id}`}</strong><small>{item.repository?.fullName || 'Repository'} · Session #{item.id}</small></span><Status status={item.status} queueState={item.executionState} /><span className="row-chevron">›</span></button>)}</div>}</div>}
      {view === 'detail' && <div className="page-content detail-page"><button className="back-button" type="button" onClick={() => navigate('sessions')}>← All sessions</button><TaskDetail data={data} /></div>}
      {view === 'repositories' && <div className="page-content"><div className="page-heading"><span className="eyebrow">Workspace</span><h1>Repositories</h1><p>Choose where Cloud Agent can work.</p></div><div className="page-toolbar"><span>{repositories.length} {repositories.length === 1 ? 'repository' : 'repositories'}</span>{user.githubAccount && <button className="secondary-button" type="button" onClick={syncRepositories} disabled={syncing}><Icon name="refresh" size={16} /> {syncing ? 'Refreshing…' : 'Refresh repositories'}</button>}</div>{!user.githubAccount ? <div className="empty-state"><Icon name="github" size={28} /><h2>Connect GitHub</h2><p>Connect your account to see repositories you can work with.</p><a className="primary-button" href="/auth/github/">Connect GitHub</a></div> : repositories.length === 0 ? <div className="empty-state"><Icon name="code" size={28} /><h2>Repositories are syncing</h2><p>Your repositories will appear here shortly.</p></div> : <div className="repository-list">{repositories.map((repo) => <div className="repository-row" key={repo.id}><span className="repo-icon"><Icon name="code" size={18} /></span><div><strong>{repo.fullName}</strong><small>GitHub repository</small></div></div>)}</div>}</div>}
      {view === 'account' && <div className="page-content"><div className="page-heading"><span className="eyebrow">Settings</span><h1>Your account</h1><p>Manage your workspace and connected account.</p></div><section className="settings-card"><h2>Profile</h2><div className="profile-line"><span className="profile-avatar">{initials}</span><div><strong>{displayName}</strong><small>{user.email}</small></div></div></section><section className="settings-card"><h2>GitHub connection</h2>{user.githubAccount ? <><p>Connected as <strong>{user.githubAccount.githubUsername}</strong>.</p><p className="muted">{repositories.length} {repositories.length === 1 ? 'repository is' : 'repositories are'} available in your workspace.</p><button className="secondary-button" type="button" onClick={() => navigate('repositories')}>View repositories</button></> : <><p>Connect GitHub to work with a repository.</p><a className="secondary-button" href="/auth/github/"><Icon name="github" size={17} /> Connect GitHub</a></>}</section><section className="settings-card"><h2>Session</h2><button className="secondary-button" type="button" onClick={onSignOut} disabled={signingOut}><Icon name="logout" size={17} /> {signingOut ? 'Signing out…' : 'Sign out'}</button></section></div>}
    </main>
  </div>;
}
