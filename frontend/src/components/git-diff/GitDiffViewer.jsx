import { useMemo } from 'react';
import { GitCommit } from 'lucide-react';
import { parseGitDiff } from '../../utils/parseGitDiff.js';
import DiffFile from './DiffFile.jsx';
import './GitDiffViewer.css';

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
          <DiffFile
            key={`${file.path}-${index}`}
            file={file}
            fileReview={fileReview}
            onFileDecision={onFileDecision}
            reviewingFile={reviewingFile}
          />
        ))}
      </div>
    </div>
  );
}
