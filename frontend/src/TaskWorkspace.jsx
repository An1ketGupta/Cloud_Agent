import { useEffect, useState } from 'react';
import { authApi } from './api/authApi';
import { taskApi } from './api/taskApi';

function displayTaskStatus(status, queueState) {
  if (status === 'completed' || status === 'failed') return status;
  if (queueState === 'missing' || queueState === 'failed') return 'needs attention';
  if (queueState === 'active' || status === 'runnning') return 'running';
  if (['waiting', 'delayed', 'prioritized'].includes(queueState)) return 'queued';
  return status;
}

function AgentOutput({ entry, index }) {
  const files = entry.agent === 'Repository Custodian'
    ? entry.output?.candidateFiles
    : entry.output?.changedFiles;

  return <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
    <h5 className="font-bold text-slate-800">{index + 1}. {entry.agent}</h5>
    {entry.output?.repositorySummary && <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-sm text-slate-700">{entry.output.repositorySummary}</p>}
    {entry.output?.goal && <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-sm text-slate-700">Goal: {entry.output.goal}</p>}
    {entry.output?.summary && <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-sm text-slate-700">{entry.output.summary}</p>}
    {files?.length > 0 && <div className="mt-2 text-sm text-slate-700">
      <strong>{entry.agent === 'Repository Custodian' ? 'Selected files' : 'Changed files'}</strong>
      <ul className="mt-1 list-disc pl-5">{files.map((file) => <li key={file} className="wrap-anywhere"><code>{file}</code></li>)}</ul>
    </div>}
    {entry.output?.acceptanceCriteria?.length > 0 && <div className="mt-2 text-sm text-slate-700"><strong>Acceptance criteria</strong>
      <ul className="mt-1 list-disc pl-5">{entry.output.acceptanceCriteria.map((criterion, itemIndex) => <li key={itemIndex} className="wrap-anywhere">{criterion}</li>)}</ul>
    </div>}
    {entry.output?.tasks?.length > 0 && <div className="mt-2 text-sm text-slate-700"><strong>Assignments</strong>
      <ol className="mt-1 list-decimal pl-5">{entry.output.tasks.map((step) => <li key={step.id} className="mb-2 wrap-anywhere"><strong>{step.role} ({step.id}):</strong> {step.instructions}<br />Files: {step.files.join(', ')}{step.dependencies.length > 0 && <> · After: {step.dependencies.join(', ')}</>}</li>)}</ol>
    </div>}
    <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium text-blue-700">Full agent output</summary>
      <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap wrap-anywhere rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(entry.output, null, 2)}</pre>
    </details>
  </article>;
}

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
  const execution = taskData?.execution;
  const status = task?.status === 'runnning' ? 'running' : task?.status;
  const displayStatus = displayTaskStatus(task?.status, execution?.state);
  const statusColors = {
    pending: 'bg-amber-50 text-amber-800',
    queued: 'bg-amber-50 text-amber-800',
    running: 'bg-blue-50 text-blue-800',
    completed: 'bg-green-50 text-green-800',
    failed: 'bg-red-50 text-red-800',
    'needs attention': 'bg-red-50 text-red-800',
  };

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
    const timer = setInterval(() => { loadTasks().catch(() => {}); }, 8000);
    return () => clearInterval(timer);
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
        setTasks((current) => current.map((item) => item.id === data.task.id
          ? { ...item, status: data.task.status }
          : item));
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
        <div><h2 className="font-display text-2xl font-bold">Your coding workspace</h2><p className="mt-1 text-slate-500">Choose a repository and describe the code change you want the agents to make.</p></div>
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
          <button type="submit" disabled={busy || !repositoryId || !prompt.trim()} className="w-fit rounded-lg bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50">{busy ? 'Submitting...' : 'Submit task'}</button>
        </form>
      )}

      {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-800" role="alert">{error}</p>}

      <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <h3 className="mb-3 font-bold">Recent tasks</h3>
          {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}
          <div className="grid min-w-0 gap-2">{tasks.map((item) => <button key={item.id} type="button" onClick={() => { setTaskData(null); setActiveId(item.id); }} className={`min-w-0 w-full rounded-lg border p-3 text-left text-sm transition-colors ${item.id === activeId ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-transparent bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
            <strong className="block truncate" title={item.repository?.fullName || 'Repository'}>{item.repository?.fullName || 'Repository'}</strong>
            <span className="mt-1 block truncate" title={item.prompt}>{item.prompt}</span>
            <span className="mt-1 block text-xs font-medium capitalize text-slate-500">{item.id === activeId && task?.id === item.id ? displayStatus : displayTaskStatus(item.status, item.executionState)}</span>
          </button>)}</div>
        </aside>

        <section className="min-w-0">
          {task && <>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-display text-xl font-bold">Task #{task.id}</h3><p className="break-words text-sm text-slate-500">{task.repository?.fullName || result?.repository} · {new Date(task.createdAt).toLocaleString()}</p></div><span className={`h-fit shrink-0 rounded-full px-3 py-1 text-sm font-bold capitalize ${statusColors[displayStatus] || statusColors.pending}`}>{displayStatus}</span></div>
            <p className="whitespace-pre-wrap wrap-anywhere rounded-lg bg-slate-50 p-4 leading-relaxed">{task.conversation[0]?.query}</p>
            {(status === 'pending' || status === 'running') && <div className="mt-5 rounded-lg border border-slate-200 p-4" role="status" aria-live="polite">
              <h4 className="font-bold">Progress</h4>
              <p className="mt-1 text-sm text-slate-600">{execution?.state === 'missing'
                ? 'This task is no longer in the queue. Submit it again to retry.'
                : execution?.state === 'failed'
                  ? execution.error || 'The queue job failed before the task status could be saved.'
                : execution?.state === 'unavailable'
                  ? 'Queue progress is temporarily unavailable. Retrying automatically.'
                  : displayStatus === 'queued'
                    ? 'Waiting for a worker to pick up this task.'
                    : displayStatus === 'running'
                      ? 'The agents are working on this task.'
                      : 'Checking the queue for this task.'}</p>
              {execution?.messages?.length > 0 && <ol className="mt-3 grid gap-2 border-l-2 border-blue-100 pl-4 text-sm text-slate-700">
                {execution.messages.map((message, index) => <li key={`${index}-${message}`} className="wrap-anywhere">{message}</li>)}
              </ol>}
            </div>}
            {result?.agentOutputs?.length > 0 && <div className="mt-5 min-w-0">
              <h4 className="mb-3 font-bold">Agent results</h4>
              <div className="grid gap-3">{result.agentOutputs.map((entry, index) => <AgentOutput key={`${entry.agent}-${index}`} entry={entry} index={index} />)}</div>
            </div>}
            {(status === 'completed' || status === 'failed') && <div className="mt-5 grid min-w-0 gap-5">
              {result?.summary && <div className="min-w-0"><h4 className="mb-2 font-bold">Summary</h4><p className="whitespace-pre-wrap wrap-anywhere leading-relaxed text-slate-700">{result.summary}</p></div>}
              {result?.error && <p className="wrap-anywhere rounded-lg bg-red-50 p-3 text-red-800">{result.error}</p>}
              {result?.review && <div><h4 className="mb-2 font-bold">QA review: {result.review.decision}</h4>{result.review.findings?.map((finding, index) => <p key={index} className="wrap-anywhere text-sm text-slate-700">{finding.file ? `${finding.file}: ` : ''}{finding.issue}</p>)}</div>}
              {result?.plan && <details><summary className="cursor-pointer font-bold">Agent plan</summary><p className="mt-2 wrap-anywhere">{result.plan.goal}</p><ol className="list-decimal pl-5">{result.plan.tasks.map((step) => <li key={step.id} className="wrap-anywhere">{step.role}: {step.instructions}</li>)}</ol></details>}
              <div className="min-w-0"><h4 className="mb-2 font-bold">Git diff</h4>{result?.patch ? <pre className="max-h-[650px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">{result.patch}</pre> : <p className="text-slate-500">No patch was saved for this task.</p>}</div>
              {result?.containerId && <p className="wrap-anywhere rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">Container: <code>{result.containerId}</code><br />Repository path: <code>{result.repositoryRoot}</code></p>}
            </div>}
          </>}
        </section>
      </div>
    </div>
  );
}
