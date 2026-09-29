import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import { taskApi } from './api/taskApi';

export default function TaskWorkspace({ initialUser }) {
  const [user, setUser] = useState(initialUser);
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [repositoryId, setRepositoryId] = useState(String(initialUser.githubAccount?.repositories[0]?.id || ''));
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const repositories = user.githubAccount?.repositories || [];
  const task = taskData?.task;
  const result = taskData?.result;
  const status = task?.status === 'runnning' ? 'running' : task?.status;

  async function loadProfile() {
    const { user: profile } = await authApi.getProfile();
    setUser(profile);
    setRepositoryId((current) => current || String(profile.githubAccount?.repositories[0]?.id || ''));
  }

  async function loadTasks() {
    const { tasks: recent } = await taskApi.list();
    setTasks(recent);
    setActiveId((current) => current || recent[0]?.id || null);
  }

  useEffect(() => {
    taskApi.list().then(({ tasks: recent }) => {
      setTasks(recent);
      setActiveId(recent[0]?.id || null);
    }).catch((requestError) => setError(requestError.message));
  }, [initialUser]);

  useEffect(() => {
    if (!user.githubAccount || repositories.length > 0) return;
    const timer = setInterval(() => { loadProfile().catch(() => {}); }, 3000);
    return () => clearInterval(timer);
  }, [user, repositories.length]);

  useEffect(() => {
    if (!activeId) return;
    let stopped = false;
    async function update() {
      try {
        const data = await taskApi.get(activeId);
        if (stopped) return;
        setTaskData(data);
        if (data.task.status === 'completed' || data.task.status === 'failed') {
          loadTasks().catch(() => {});
        }
      } catch (requestError) {
        if (!stopped) setError(requestError.message);
      }
    }
    update();
    if (status === 'completed' || status === 'failed') return () => { stopped = true; };
    const timer = setInterval(update, 2500);
    return () => { stopped = true; clearInterval(timer); };
  }, [activeId, status]);

  async function syncRepositories() {
    setError('');
    try {
      await taskApi.syncRepositories();
      setTimeout(() => { loadProfile().catch(() => {}); }, 2000);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submitTask(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { task: created } = await taskApi.create(Number(repositoryId), prompt.trim());
      setPrompt('');
      setTaskData(null);
      setActiveId(created.id);
      await loadTasks();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="font-display text-2xl font-bold">Your coding workspace</h2><p className="mt-1 text-slate-500">Choose a repository, write a prompt, and review the resulting patch.</p></div>
        {user.githubAccount && <button type="button" onClick={syncRepositories} className="font-bold text-blue-700 hover:underline">Refresh repositories</button>}
      </div>

      {!user.githubAccount ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="mb-4 text-slate-700">Connect GitHub to select a repository.</p>
          <a href="/auth/github/" className="inline-block rounded-lg bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800">Connect GitHub</a>
        </div>
      ) : (
        <form onSubmit={submitTask} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <label className="grid gap-2 font-bold text-slate-700">Repository
            <select value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">
              {repositories.length === 0 && <option value="">Repositories are syncing...</option>}
              {repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.fullName}</option>)}
            </select>
          </label>
          <label className="grid gap-2 font-bold text-slate-700">Your prompt
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows="5" required placeholder="Describe the issue or change you want..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal" />
          </label>
          <button type="submit" disabled={busy || !repositoryId || !prompt.trim()} className="w-fit rounded-lg bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50">{busy ? 'Starting...' : 'Run agents'}</button>
        </form>
      )}

      {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{error}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <h3 className="mb-3 font-bold">Recent tasks</h3>
          {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}
          <div className="grid gap-2">{tasks.map((item) => <button key={item.id} type="button" onClick={() => { setTaskData(null); setActiveId(item.id); }} className={`rounded-lg p-3 text-left text-sm ${item.id === activeId ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
            <strong className="block truncate">{item.repository?.fullName || 'Repository'}</strong>
            <span className="block truncate">{item.prompt}</span>
            <span className="capitalize text-slate-500">{item.status === 'runnning' ? 'running' : item.status}</span>
          </button>)}</div>
        </aside>

        <section className="min-w-0">
          {task && <>
            <div className="mb-4 flex flex-wrap justify-between gap-3"><div><h3 className="font-display text-xl font-bold">Task #{task.id}</h3><p className="text-sm text-slate-500">{task.repository?.fullName || result?.repository} · {new Date(task.createdAt).toLocaleString()}</p></div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-bold capitalize text-blue-800">{status}</span></div>
            <p className="rounded-lg bg-slate-50 p-4 whitespace-pre-wrap">{task.conversation[0]?.query}</p>
            {(status === 'pending' || status === 'running') && <p className="mt-4 text-slate-500">The agents are working. This view updates automatically.</p>}
            {(status === 'completed' || status === 'failed') && <div className="mt-5 grid gap-5">
              {result?.summary && <div><h4 className="mb-2 font-bold">Summary</h4><p className="whitespace-pre-wrap text-slate-700">{result.summary}</p></div>}
              {result?.error && <p className="rounded-lg bg-red-50 p-3 text-red-800">{result.error}</p>}
              {result?.review && <div><h4 className="mb-2 font-bold">QA review: {result.review.decision}</h4>{result.review.findings?.map((finding, index) => <p key={index}>{finding.file ? `${finding.file}: ` : ''}{finding.issue}</p>)}</div>}
              {result?.plan && <details><summary className="cursor-pointer font-bold">Agent plan</summary><p className="mt-2">{result.plan.goal}</p><ol className="list-decimal pl-5">{result.plan.tasks.map((step) => <li key={step.id}>{step.role}: {step.instructions}</li>)}</ol></details>}
              <div><h4 className="mb-2 font-bold">Git diff</h4>{result?.patch ? <pre className="max-h-[650px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">{result.patch}</pre> : <p className="text-slate-500">No diff was saved for this task.</p>}</div>
            </div>}
          </>}
        </section>
      </div>
    </div>
  );
}
