import { useEffect, useRef, useState } from 'react';
import { GitPullRequest, Loader2, X } from 'lucide-react';
import { conversationApi } from '../../api/conversationApi.js';

export default function CreatePullRequestDialog({ conversationId, taskId, onClose, onCreated, onBusyChange }) {
  const dialog = useRef(null);
  const [options, setOptions] = useState(null);
  const [details, setDetails] = useState({ title: '', body: '', base: '', branch: '', draft: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    dialog.current.showModal();
  }, []);

  useEffect(() => {
    let stopped = false;
    conversationApi.pullRequestOptions(conversationId, taskId).then((data) => {
      if (stopped) return;
      setOptions(data);
      setDetails({ title: data.title, body: data.body, base: data.base, branch: data.branch, draft: data.draft });
    }).catch((requestError) => {
      if (!stopped) setError(requestError.message);
    });
    return () => { stopped = true; };
  }, [conversationId, taskId, reload]);

  function update(event) {
    const { name, value, checked, type } = event.target;
    setDetails((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    onBusyChange(true);
    try {
      const { pullRequest } = await conversationApi.createPullRequest(conversationId, taskId, details);
      onCreated(pullRequest);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  const fieldClass = 'w-full rounded-lg border border-white/[0.12] bg-[#08090a] px-3 py-2 text-sm text-[#f7f8f8] outline-none focus:border-[#828fff] disabled:opacity-60';

  return (
    <dialog ref={dialog} aria-labelledby="pr-dialog-title" onCancel={(event) => {
      event.preventDefault();
      if (!busy) onClose();
    }} className="m-auto w-[calc(100%-2rem)] max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#0f1013] p-5 sm:p-6 text-[#f7f8f8] shadow-2xl backdrop:bg-black/75">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 id="pr-dialog-title" className="flex items-center gap-2 text-lg font-semibold">
          <GitPullRequest className="w-5 h-5 text-[#828fff]" /> Create pull request
        </h2>
        <button type="button" aria-label="Close pull request form" disabled={busy} onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.08] disabled:opacity-40"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-xs text-[#8a8f98] mb-5">
        Publish the current task changes to {options?.repository || 'your GitHub repository'} on a separate branch. Changes removed during file review are excluded.
      </p>
      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {!options ? (
        error ? <button type="button" className="linear-btn-secondary" onClick={() => { setError(''); setReload((value) => value + 1); }}>Try again</button>
          : <p role="status" className="flex items-center gap-2 text-sm text-[#8a8f98]"><Loader2 className="w-4 h-4 animate-spin" /> Loading repository branches...</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-xs font-medium space-y-1.5">
              <span>PR title <span className="text-[#8a8f98]">(required)</span></span>
              <input autoFocus name="title" required maxLength={256} value={details.title} onChange={update} className={fieldClass} />
            </label>
            <label className="block text-xs font-medium space-y-1.5">
              <span>Description</span>
              <textarea name="body" rows={6} maxLength={60000} value={details.body} onChange={update} placeholder="Describe the changes and how you tested them. Markdown is supported." className={`${fieldClass} resize-y`} />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-xs font-medium space-y-1.5">
                <span>Target branch <span className="text-[#8a8f98]">(required)</span></span>
                <select name="base" required value={details.base} onChange={update} className={fieldClass}>
                  {options.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium space-y-1.5">
                <span>New task branch <span className="text-[#8a8f98]">(required)</span></span>
                <input name="branch" required maxLength={200} value={details.branch} onChange={update} className={fieldClass} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#dedee2]">
              <input type="checkbox" name="draft" checked={details.draft} onChange={update} className="accent-[#5e6ad2]" /> Create as draft
            </label>
          </fieldset>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button type="button" disabled={busy} onClick={onClose} className="linear-btn-secondary">Cancel</button>
            <button type="submit" disabled={busy || !details.title.trim() || !details.branch.trim() || !details.base || details.branch.trim() === details.base} className="linear-btn-primary">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />}
              {busy ? 'Creating PR...' : 'Create PR'}
            </button>
          </div>
          {busy && <p role="status" className="text-xs text-[#8a8f98]">Publishing the branch and opening your pull request on GitHub...</p>}
        </form>
      )}
    </dialog>
  );
}
