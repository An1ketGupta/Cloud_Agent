import { FolderGit2, Loader2, MessageSquare, Send, Sparkles, Terminal } from 'lucide-react';

export default function Composer({
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
