import { useMemo } from 'react';
import { parseGitDiff } from './parseGitDiff';
import { Check, X, Undo, GitCommit } from 'lucide-react';

function fileLabel(path) {
  const extension = path.split('.').pop()?.toUpperCase();
  return extension && extension.length <= 4 && extension !== path.toUpperCase() ? extension : 'FILE';
}

function DiffRow({ row }) {
  if (row.type === 'hunk') {
    return (
      <div className="gitdiff-hunk">
        <code>{row.text}</code>
      </div>
    );
  }
  if (row.type === 'note') {
    return (
      <div className="gitdiff-note">
        <code>{row.text}</code>
      </div>
    );
  }
  return (
    <div className={`gitdiff-row gitdiff-${row.type}`}>
      <span className="gitdiff-old-number">{row.oldNumber ?? ''}</span>
      <span className="gitdiff-new-number">{row.newNumber ?? ''}</span>
      <span className="gitdiff-marker">{row.type === 'add' ? '+' : row.type === 'remove' ? '−' : ' '}</span>
      <code>{row.text || ' '}</code>
    </div>
  );
}

export default function GitDiffViewer({ patch, fileReview, onFileDecision, reviewingFile }) {
  const files = useMemo(() => parseGitDiff(patch), [patch]);

  if (!files.length) {
    return (
      <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0c0d10] text-center text-xs text-[#71757e]">
        No patch was saved for this task.
      </div>
    );
  }

  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);

  return (
    <div className="gitdiff-viewer my-4">
      {/* Diff Header */}
      <div className="gitdiff-summary">
        <div className="flex items-center gap-2">
          <GitCommit className="w-3.5 h-3.5 text-[#828fff]" />
          <span>{files.length} {files.length === 1 ? 'file' : 'files'} changed</span>
        </div>
        <div className="gitdiff-counts">
          <span className="text-emerald-400 font-medium">+{additions}</span>
          <span className="text-rose-400 font-medium">−{deletions}</span>
        </div>
      </div>

      {/* Files List */}
      <div className="gitdiff-files">
        {files.map((file, index) => (
          <details className="gitdiff-file" key={`${file.path}-${index}`} open>
            <summary className="gitdiff-file-header">
              <span className="gitdiff-disclosure">⌄</span>
              <span className="gitdiff-file-icon">{fileLabel(file.path)}</span>
              <span className="gitdiff-file-name" title={file.path}>{file.path}</span>
              <span className={`gitdiff-file-status gitdiff-status-${file.status}`}>{file.status}</span>
              <div className="gitdiff-counts ml-auto text-[11px]">
                <span className="text-emerald-400 font-medium">+{file.additions}</span>
                <span className="text-rose-400 font-medium">−{file.deletions}</span>
              </div>
            </summary>

            {/* Review actions toolbar */}
            {fileReview && Object.hasOwn(fileReview.files, file.path) && (
              <div className="file-review-actions">
                {fileReview.revertedPaths?.includes(file.path) && (
                  <span className="file-review-status text-[#8a8f98]">
                    Restored original repository version.
                  </span>
                )}
                {fileReview.files[file.path] === 'pending' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!!reviewingFile}
                      onClick={() => onFileDecision(file.path, 'accept')}
                      className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      <Check className="w-3 h-3" /> Accept
                    </button>
                    <button
                      type="button"
                      disabled={!!reviewingFile}
                      onClick={() => onFileDecision(file.path, 'remove')}
                      className="px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      <X className="w-3 h-3" /> Revert
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs font-medium flex items-center gap-1.5 ${
                    fileReview.files[file.path] === 'accepted' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {fileReview.files[file.path] === 'accepted' ? (
                      <><Check className="w-3 h-3" /> Accepted</>
                    ) : fileReview.files[file.path] === 'removed' ? (
                      <><Undo className="w-3 h-3" /> Reverted</>
                    ) : (
                      'Updating…'
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Diff Lines Body */}
            <div className="gitdiff-body" role="region" aria-label={`Changes in ${file.path}`}>
              {file.status === 'renamed' && file.oldPath && (
                <div className="gitdiff-metadata">Renamed from {file.oldPath}</div>
              )}
              {file.metadata.length > 0 && (
                <div className="gitdiff-metadata">
                  {file.metadata.map((line, lineIndex) => (
                    <div key={lineIndex}>{line}</div>
                  ))}
                </div>
              )}
              {file.rows.length > 0 ? (
                file.rows.map((row, rowIndex) => <DiffRow row={row} key={rowIndex} />)
              ) : (
                <div className="gitdiff-metadata">No text changes to display.</div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
