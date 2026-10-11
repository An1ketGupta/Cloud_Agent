import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import { conversationApi } from './api/conversationApi';
import GitDiffViewer from './GitDiffViewer';
import { 
  Plus, 
  Home, 
  MessageSquare, 
  FolderGit2, 
  Settings, 
  ChevronRight, 
  ArrowLeft, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  LogOut, 
  Menu, 
  X, 
  Code2,
  Terminal,
  ShieldAlert,
  Bug,
  TestTube2
} from 'lucide-react';

function RunDetails({ task, execution, onFileDecision, reviewingFile }) {
  let result;
  try {
    result = JSON.parse(task.conversation?.[0]?.response || 'null');
  } catch {
    result = null;
  }
  const active = task.status === 'pending' || task.status === 'runnning';

  return (
    <div className="mt-4 pt-3 border-t border-white/[0.08]">
      <div className="flex items-center justify-between text-xs font-mono text-[#8a8f98] mb-2">
        <div className="flex items-center gap-2">
          {active ? (
            <Loader2 className="w-3.5 h-3.5 text-[#828fff] animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Code Run #{task.id}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
            active ? 'bg-[#5e6ad2]/20 text-[#828fff] border border-[#5e6ad2]/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
          }`}>
            {task.status === 'runnning' ? 'running' : task.status}
          </span>
        </div>
      </div>

      {active && (
        <div className="p-3.5 rounded-xl bg-[#0c0d10] border border-white/[0.07] text-xs text-[#a1a1aa] space-y-2">
          <p className="flex items-center gap-2 font-medium text-[#f7f8f8]">
            <span className="w-2 h-2 rounded-full bg-[#5e6ad2] animate-ping" />
            {execution?.state === 'missing'
              ? 'Queue job waiting in line…'
              : execution?.state === 'unavailable'
              ? 'Progress momentarily updating…'
              : 'Cloud Agent is analyzing repository & editing code in sandbox…'}
          </p>
          {execution?.messages?.length > 0 && (
            <div className="pl-4 border-l border-white/[0.08] space-y-1 font-mono text-[11px] text-[#71757e]">
              {execution.messages.map((line, index) => (
                <div key={`${index}-${line}`} className="truncate">
                  › {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result?.review && (
        <div className="mt-3 p-3.5 rounded-xl bg-[#14151a] border border-white/[0.07] flex items-start gap-2.5 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-[#f7f8f8]">
              QA Review: <span className="text-amber-300 font-semibold uppercase">{result.review.decision}</span>
            </div>
            {result.review.findings?.length > 0 && (
              <p className="text-[#8a8f98] mt-1 text-[11px] leading-relaxed">
                {result.review.findings.map((f) => f.issue).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}

      {(result?.patch || result?.fileReview?.displayPatch) && (
        <GitDiffViewer
          patch={result.fileReview?.displayPatch || result.patch}
          fileReview={result.fileReview}
          onFileDecision={(path, decision) => onFileDecision(task.id, path, decision)}
          reviewingFile={reviewingFile}
        />
      )}

      {result?.error && (
        <div className="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          {result.error}
        </div>
      )}

      {!active && !result?.patch && !result?.error && (
        <p className="text-xs text-[#52555c] italic mt-2">No code patch was generated for this run.</p>
      )}
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  busy,
  disabled,
  mode,
  onModeChange,
  repository,
  onRepositoryChange,
  repositories,
  isNew,
}) {
  function submit(event) {
    event.preventDefault();
    onSend(mode);
  }

  return (
    <form 
      onSubmit={submit} 
      className="rounded-2xl border border-white/[0.1] bg-[#0f1013]/95 backdrop-blur-xl p-4 md:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] focus-within:border-white/[0.22] transition-all"
    >
      <label className="sr-only" htmlFor="conversation-prompt">
        Message
      </label>
      <textarea
        id="conversation-prompt"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        required
        placeholder={
          mode === 'code'
            ? 'Describe what you want the Cloud Agent to build or fix'
            : 'Ask any question to explore or understand this repository…'
        }
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="w-full bg-transparent border-0 outline-none text-[#f7f8f8] placeholder:text-[#52555c] resize-none text-sm md:text-base leading-relaxed px-1"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-white/[0.06] mt-2">
        {/* Repo Picker or Shortcut Hint */}
        {isNew ? (
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-3.5 h-3.5 text-[#8a8f98]" />
            <select
              value={repository}
              onChange={(event) => onRepositoryChange(event.target.value)}
              aria-label="Repository"
              required
              className="bg-[#15161b] border border-white/[0.08] text-xs text-[#dedee2] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-[#5e6ad2]"
            >
              <option value="">Select target repository</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.fullName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-[11px] text-[#52555c] font-mono flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]">⌘ Enter</kbd> to run
          </span>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Ask vs. Agent Mode Switch */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#08090a] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => onModeChange('chat')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'chat'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3 h-3" /> Ask
            </button>
            <button
              type="button"
              onClick={() => onModeChange('code')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'code'
                  ? 'bg-[#5e6ad2] text-white shadow-[0_0_12px_rgba(94,106,210,0.4)]'
                  : 'text-[#8a8f98] hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" /> Agent
            </button>
          </div>

          <button
            type="submit"
            disabled={busy || disabled || !value.trim()}
            className="linear-btn-primary h-8 px-3.5 text-xs"
          >
            {busy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Working…
              </>
            ) : mode === 'code' ? (
              <>
                <Terminal className="w-3.5 h-3.5" /> Run agent
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Ask
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ConversationWorkspace({
  initialUser,
  onSignOut,
  signingOut,
  accountError,
}) {
  const [user, setUser] = useState(initialUser);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [data, setData] = useState(null);
  const [view, setView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState(
    String(initialUser.githubAccount?.repositories[0]?.id || '')
  );
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('code');
  const [reviewingFile, setReviewingFile] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const repositories = user.githubAccount?.repositories || [];
  const conversation = data?.conversation;
  const pending = conversation?.messages?.some(
    (message) => message.role === 'assistant' && message.status === 'pending'
  );
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
  const initials =
    [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() ||
    user.email?.[0]?.toUpperCase();

  async function refreshList() {
    const { conversations: items } = await conversationApi.list();
    setConversations(items);
  }

  async function refreshConversation(id) {
    const next = await conversationApi.get(id);
    setData(next);
    return next;
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
      } catch (requestError) {
        if (!stopped) setError(requestError.message);
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
  }, []);

  useEffect(() => {
    if (!user.githubAccount || repositories.length) return;
    const timer = setInterval(() => {
      authApi
        .getProfile()
        .then(({ user: profile }) => {
          setUser(profile);
          setRepositoryId((current) => current || String(profile.githubAccount?.repositories[0]?.id || ''));
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [user.githubAccount, repositories.length]);

  useEffect(() => {
    if (!activeId || view !== 'conversation') return;
    let stopped = false;
    let loading = false;
    async function update() {
      if (loading) return;
      loading = true;
      try {
        const next = await conversationApi.get(activeId);
        if (!stopped) setData(next);
      } catch (requestError) {
        if (!stopped) setError(requestError.message);
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
  }, [activeId, view]);

  function navigate(next) {
    setView(next);
    setSidebarOpen(false);
    setError('');
  }

  function openConversation(id) {
    setData(null);
    setActiveId(id);
    setPrompt('');
    navigate('conversation');
  }

  async function syncRepositories() {
    setSyncing(true);
    setError('');
    try {
      await conversationApi.syncRepositories();
      const { user: profile } = await authApi.getProfile();
      setUser(profile);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSyncing(false);
    }
  }

  async function send(sendMode) {
    const content = prompt.trim();
    if (!content || busy || (view === 'conversation' && pending)) return;
    setBusy(true);
    setError('');
    try {
      let id = activeId;
      if (view !== 'conversation') {
        const { conversation: created } = await conversationApi.create(Number(repositoryId));
        id = created.id;
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

  const tasks = new Map(conversation?.tasks?.map((task) => [task.id, task]) || []);

  // Project-relevant starter workflows matching the design system cards
  const taskTemplates = [
    {
      icon: Bug,
      category: 'Issue Resolution',
      title: 'Fix a bug or failing test',
      description: 'Agent clones your repo into a sandbox, inspects stack traces, and writes code fixes.',
      mode: 'code',
      prompt: 'Diagnose the failing tests in this repository, find the root cause, and implement the necessary bug fixes.',
    },
    {
      icon: Code2,
      category: 'Feature Development',
      title: 'Implement feature or API endpoint',
      description: 'Describe requirements in plain language and review the resulting code changes in an interactive diff.',
      mode: 'code',
      prompt: 'Implement a new feature with complete error handling, validation, and corresponding test coverage.',
    },
    {
      icon: TestTube2,
      category: 'Quality Assurance',
      title: 'Generate unit & integration tests',
      description: 'Boost repository test coverage with automated unit, integration, and edge-case test suites.',
      mode: 'code',
      prompt: 'Analyze uncovered files and functions in the repository and create automated test suites.',
    },
    {
      icon: MessageSquare,
      category: 'Codebase Exploration',
      title: 'Analyze architecture & codebase',
      description: 'Ask questions to explore repository structure, data flows, dependencies, or logic.',
      mode: 'chat',
      prompt: 'Provide a breakdown of the repository architecture, major service modules, and entry points.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] flex flex-col md:flex-row antialiased selection:bg-[#5e6ad2]/30 selection:text-white">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#0c0d10] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-[#5e6ad2] to-[#828fff] flex items-center justify-center">
            <div className="w-2 h-2 border border-white rotate-45" />
          </div>
          <span className="font-semibold text-sm">Cloud Agent</span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] text-[#8a8f98]"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Sidebar Scrim (Mobile) */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* ================= Linear Sidebar ================= */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-72 bg-[#0c0d10] border-r border-white/[0.08] flex flex-col justify-between p-3.5 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Workspace / Brand Header */}
          <div className="flex items-center justify-between px-2 py-2 mb-3">
            <button
              type="button"
              onClick={() => navigate('account')}
              className="flex items-center gap-2.5 text-left w-full group"
            >
              <div className="w-6 h-6 rounded bg-gradient-to-br from-[#5e6ad2] to-[#828fff] flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_12px_rgba(94,106,210,0.4)]">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#f7f8f8] truncate group-hover:text-white transition-colors">
                  {displayName}
                </div>
                <div className="text-[10px] text-[#71757e] truncate font-mono">
                  Cloud Agent Workspace
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-[#71757e] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Conversation Button */}
          <button
            type="button"
            onClick={() => {
              setActiveId(null);
              setData(null);
              setPrompt('');
              navigate('home');
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.09] text-xs font-medium text-[#f7f8f8] transition-all shadow-sm group mb-4"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-[#828fff]" /> New task
            </span>
          </button>

          {/* Primary Navigation */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => navigate('home')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'home'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
              }`}
            >
              <Home className="w-3.5 h-3.5" /> Home
            </button>
            <button
              type="button"
              onClick={() => navigate('conversations')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'conversations' || view === 'conversation'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Tasks & Chats
            </button>
            <button
              type="button"
              onClick={() => navigate('repositories')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'repositories'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" /> Repositories
            </button>
            <button
              type="button"
              onClick={() => navigate('account')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'account'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.04]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
          </nav>

          {/* Recent Tasks */}
          <div className="mt-6">
            <div className="px-2 text-[10px] font-semibold text-[#62666d] tracking-wider uppercase mb-2">
              Recent Code Tasks
            </div>
            <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <div className="px-2 text-xs text-[#52555c] italic">No active tasks yet</div>
              ) : (
                conversations.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openConversation(item.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all truncate ${
                      activeId === item.id && view === 'conversation'
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-[#8a8f98] hover:text-[#dedee2] hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2]/60 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-3 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => navigate('account')}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.04] transition-all text-left"
          >
            <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-[10px] font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#f7f8f8] truncate">{displayName}</div>
              <div className="text-[10px] text-[#71757e] truncate">{user.email}</div>
            </div>
          </button>
        </div>
      </aside>

      {/* ================= Main Workspace Area ================= */}
      <main className="flex-1 min-w-0 min-h-screen flex flex-col relative">
        {/* Global Alert */}
        {(error || accountError) && (
          <div className="sticky top-4 z-30 mx-auto max-w-xl w-[90%] notice notice-error shadow-xl flex items-center justify-between">
            <span>{error || accountError}</span>
            <button type="button" onClick={() => setError('')} className="text-xs underline ml-3">Dismiss</button>
          </div>
        )}

        {/* ================= VIEW: HOME ================= */}
        {view === 'home' && (
          <div className="flex-1 flex flex-col items-center">
            {/* Top Hero & Fast Composer Section */}
            <div className="w-full max-w-4xl px-4 sm:px-6 pt-12 md:pt-16 pb-8">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium tracking-[0.1em] text-[#8a8f98] uppercase mb-4">
                  <Sparkles className="w-3 h-3 text-[#828fff]" /> Autonomous GitHub Agent
                </span>
                <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] text-[#f7f8f8] leading-[1.1] mb-3">
                  Solve issues directly in your repository
                </h1>
                <p className="text-[#8a8f98] text-sm sm:text-base leading-relaxed">
                  Choose a repository, provide a prompt, and the agent edits code in a container sandbox, reviews the changes, and generates an interactive diff.
                </p>
              </div>

              {/* Composer */}
              {!user.githubAccount ? (
                <div className="rounded-2xl border border-white/[0.09] bg-[#0f1013] p-8 text-center shadow-lg max-w-xl mx-auto">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#828fff]">
                    <FolderGit2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-semibold text-[#f7f8f8] mb-1.5">
                    Connect your GitHub account
                  </h2>
                  <p className="text-xs text-[#8a8f98] max-w-sm mx-auto mb-5">
                    Link your GitHub account so Cloud Agent can clone, read, and write code to your repositories.
                  </p>
                  <a
                    href="/auth/github/"
                    className="linear-btn-primary inline-flex items-center gap-2"
                  >
                    Connect GitHub <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <Composer
                  value={prompt}
                  onChange={setPrompt}
                  onSend={send}
                  busy={busy}
                  disabled={!repositoryId}
                  mode={mode}
                  onModeChange={setMode}
                  repository={repositoryId}
                  onRepositoryChange={setRepositoryId}
                  repositories={repositories}
                  isNew
                />
              )}
            </div>

            {/* Quick Starter Templates in the Linear Card Grid System */}
            <div className="w-full max-w-4xl px-4 sm:px-6 pb-16">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-medium tracking-[0.08em] text-[#71757e] uppercase">
                  Quick Tasks
                </span>
                <span className="text-xs text-[#52555c]">
                  Click to prefill prompt
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {taskTemplates.map((t, idx) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setPrompt(t.prompt);
                        setMode(t.mode);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="group rounded-2xl bg-[#0f1013]/90 hover:bg-[#131418] border border-white/[0.08] hover:border-white/[0.18] p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(94,106,210,0.1)] relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#828fff] group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#71757e] px-2 py-0.5 rounded bg-white/[0.04]">
                          {t.mode === 'code' ? 'Agent' : 'Ask'}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[11px] font-medium text-[#71757e] uppercase tracking-wider mb-1">
                          {t.category}
                        </span>
                        <h3 className="text-sm font-semibold text-[#f7f8f8] tracking-tight group-hover:text-white mb-1.5">
                          {t.title}
                        </h3>
                        <p className="text-xs text-[#8a8f98] leading-relaxed">
                          {t.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#71757e] group-hover:text-[#dedee2] transition-colors">
                        <span>Use this template</span>
                        <div className="w-6 h-6 rounded-full border border-white/[0.1] group-hover:border-white/[0.25] flex items-center justify-center">
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW: CONVERSATIONS / TASKS LIST ================= */}
        {view === 'conversations' && (
          <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <span className="text-[11px] font-medium tracking-[0.08em] text-[#71757e] uppercase">
                  Workspace
                </span>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#f7f8f8] mt-1">
                  Tasks & Conversations
                </h1>
                <p className="text-xs sm:text-sm text-[#8a8f98] mt-1">
                  Continue active agent runs or review previous repository diffs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('home')}
                className="linear-btn-primary self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> New task
              </button>
            </div>

            {conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.12] p-12 text-center bg-[#0c0d10]/40">
                <MessageSquare className="w-8 h-8 text-[#52555c] mx-auto mb-3" />
                <h2 className="text-base font-medium text-[#f7f8f8] mb-1">No active tasks yet</h2>
                <p className="text-xs text-[#8a8f98] max-w-sm mx-auto mb-4">
                  Select a repository on the home screen to launch your first code task.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('home')}
                  className="linear-btn-secondary"
                >
                  Create one now
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d10] overflow-hidden divide-y divide-white/[0.06]">
                {conversations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openConversation(item.id)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-white/[0.03] transition-all group"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="text-sm font-medium text-[#f7f8f8] group-hover:text-white transition-colors truncate">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#71757e] mt-1 font-mono">
                        <span>{item.repository?.fullName || 'Repository'}</span>
                        <span>·</span>
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#52555c] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW: ACTIVE CONVERSATION ================= */}
        {view === 'conversation' && (
          <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 min-h-screen">
            {/* Header */}
            <div className="pb-4 mb-6 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('conversations')}
                  className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#8a8f98] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-[#f7f8f8]">
                    {conversation?.title || 'Conversation'}
                  </h1>
                  <span className="text-xs text-[#71757e] font-mono">
                    {conversation?.repository?.fullName || 'Repository…'}
                  </span>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 space-y-4 mb-6">
              {!conversation ? (
                <div className="text-center py-16 text-xs text-[#71757e] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#828fff]" /> Loading task session…
                </div>
              ) : (
                conversation.messages.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <article
                      key={message.id}
                      className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                        isUser
                          ? 'bg-[#121318] border-white/[0.1] ml-auto max-w-[85%]'
                          : 'bg-[#0f1013] border-white/[0.08] mr-auto w-full'
                      }`}
                    >
                      {/* Message Sender Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isUser ? (
                            <span className="text-xs font-semibold text-[#f7f8f8]">You</span>
                          ) : (
                            <>
                              <div className="w-4 h-4 rounded bg-[#5e6ad2] flex items-center justify-center text-[9px] text-white font-bold">
                                C
                              </div>
                              <span className="text-xs font-semibold text-[#f7f8f8]">Cloud Agent</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-[#8a8f98]">
                                {message.mode === 'code' ? 'Agent' : 'Ask'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-[#dedee2] leading-relaxed whitespace-pre-wrap">
                        {message.status === 'pending'
                          ? message.mode === 'code'
                            ? 'Agent is inspecting repository files and modifying code…'
                            : 'Reading repository context…'
                          : message.content}
                      </p>

                      {/* Run Details if assistant message with taskId */}
                      {message.taskId &&
                        message.role === 'assistant' &&
                        tasks.has(message.taskId) && (
                          <RunDetails
                            task={tasks.get(message.taskId)}
                            execution={data.execution?.[message.taskId]}
                            onFileDecision={reviewFile}
                            reviewingFile={reviewingFile}
                          />
                        )}
                    </article>
                  );
                })
              )}
            </div>

            {/* Bottom Sticky Composer */}
            <div className="sticky bottom-4 z-20">
              <Composer
                value={prompt}
                onChange={setPrompt}
                onSend={send}
                busy={busy}
                disabled={pending || !conversation}
                mode={mode}
                onModeChange={setMode}
              />
            </div>
          </div>
        )}

        {/* ================= VIEW: REPOSITORIES ================= */}
        {view === 'repositories' && (
          <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <span className="text-[11px] font-medium tracking-[0.08em] text-[#71757e] uppercase">
                  Connected Codebases
                </span>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#f7f8f8] mt-1">
                  Repositories
                </h1>
                <p className="text-xs sm:text-sm text-[#8a8f98] mt-1">
                  Repositories your Cloud Agent can clone and solve issues in.
                </p>
              </div>
              <button
                type="button"
                onClick={syncRepositories}
                disabled={syncing}
                className="linear-btn-secondary self-start sm:self-auto flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync GitHub'}
              </button>
            </div>

            {repositories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.12] p-12 text-center bg-[#0c0d10]/40">
                <FolderGit2 className="w-8 h-8 text-[#52555c] mx-auto mb-3" />
                <h2 className="text-base font-medium text-[#f7f8f8] mb-1">No repositories found</h2>
                <p className="text-xs text-[#8a8f98] max-w-sm mx-auto mb-4">
                  Connect your GitHub account or refresh to sync your repository list.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c0d10] hover:border-white/[0.18] transition-all flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <FolderGit2 className="w-4 h-4 text-[#828fff]" />
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-[#8a8f98]">
                          GitHub
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#f7f8f8] truncate">
                        {repo.fullName}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRepositoryId(String(repo.id));
                        navigate('home');
                      }}
                      className="mt-4 pt-3 border-t border-white/[0.06] text-xs text-[#828fff] hover:text-white flex items-center gap-1 font-medium"
                    >
                      Start task on this repository <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW: ACCOUNT ================= */}
        {view === 'account' && (
          <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">
            <div className="mb-8">
              <span className="text-[11px] font-medium tracking-[0.08em] text-[#71757e] uppercase">
                Settings
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#f7f8f8] mt-1">
                Your Account
              </h1>
            </div>

            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0d10]">
                <h2 className="text-sm font-semibold text-[#f7f8f8] mb-3">Profile details</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5e6ad2] to-[#828fff] flex items-center justify-center font-bold text-white text-sm">
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#f7f8f8]">{displayName}</div>
                    <div className="text-xs text-[#8a8f98]">{user.email}</div>
                  </div>
                </div>
              </div>

              {/* GitHub Card */}
              <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0d10] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#f7f8f8]">GitHub Connection</h2>
                  <p className="text-xs text-[#8a8f98] mt-1">
                    {user.githubAccount
                      ? `Connected as @${user.githubAccount.githubUsername}`
                      : 'No GitHub account connected yet.'}
                  </p>
                </div>
                {!user.githubAccount && (
                  <a href="/auth/github/" className="linear-btn-secondary text-xs">
                    Connect GitHub
                  </a>
                )}
              </div>

              {/* Sign Out Card */}
              <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0d10] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#f7f8f8]">Active Session</h2>
                  <p className="text-xs text-[#8a8f98] mt-1">Sign out of your active workspace session.</p>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={signingOut}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
