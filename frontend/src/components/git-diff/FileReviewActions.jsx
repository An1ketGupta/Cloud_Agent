import { Check, Undo, X } from 'lucide-react';

export default function FileReviewActions({ file, fileReview, onFileDecision, reviewingFile }) {
  return (
    <>
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

    </>
  );
}
