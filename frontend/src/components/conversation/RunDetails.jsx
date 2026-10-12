import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import GitDiffViewer from '../git-diff/GitDiffViewer.jsx';

export default function RunDetails({ task, execution, onFileDecision, reviewingFile }) {
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
