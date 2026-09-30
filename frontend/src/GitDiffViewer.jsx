import { useMemo } from 'react';
import { parseGitDiff } from './parseGitDiff';

function fileLabel(path) {
  const extension = path.split('.').pop()?.toUpperCase();
  return extension && extension.length <= 4 && extension !== path.toUpperCase() ? extension : 'FILE';
}

function DiffRow({ row }) {
  if (row.type === 'hunk') return <div className="gitdiff-hunk"><span className="gitdiff-gutter" /><code>{row.text}</code></div>;
  if (row.type === 'note') return <div className="gitdiff-note"><span className="gitdiff-gutter" /><code>{row.text}</code></div>;
  return <div className={`gitdiff-row gitdiff-${row.type}`}>
    <span className="gitdiff-old-number" aria-label={row.oldNumber == null ? undefined : `Old line ${row.oldNumber}`}>{row.oldNumber ?? ''}</span>
    <span className="gitdiff-new-number" aria-label={row.newNumber == null ? undefined : `New line ${row.newNumber}`}>{row.newNumber ?? ''}</span>
    <span className="gitdiff-marker" aria-hidden="true">{row.type === 'add' ? '+' : row.type === 'remove' ? '−' : ' '}</span>
    <code>{row.text || ' '}</code>
  </div>;
}

export default function GitDiffViewer({ patch, fileReview, onFileDecision, reviewingFile }) {
  const files = useMemo(() => parseGitDiff(patch), [patch]);
  if (!files.length) return <p className="muted">No patch was saved for this task.</p>;
  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);

  return <div className="gitdiff-viewer">
    <div className="gitdiff-summary"><span>{files.length} {files.length === 1 ? 'file' : 'files'} changed</span><span className="gitdiff-counts"><span>+{additions}</span><span>−{deletions}</span></span></div>
    <div className="gitdiff-files">{files.map((file, index) => <details className="gitdiff-file" key={`${file.path}-${index}`} open>
      <summary className="gitdiff-file-header"><span className="gitdiff-disclosure" aria-hidden="true">⌄</span><span className="gitdiff-file-icon">{fileLabel(file.path)}</span><span className="gitdiff-file-name" title={file.path}>{file.path}</span><span className={`gitdiff-file-status gitdiff-status-${file.status}`}>{file.status}</span><span className="gitdiff-counts"><span>+{file.additions}</span><span>−{file.deletions}</span></span></summary>
      {fileReview && Object.hasOwn(fileReview.files, file.path) && <div className="file-review-actions">
        {fileReview.revertedPaths?.includes(file.path) && <span className="file-review-status">This run restored the repository version.</span>}
        {fileReview.files[file.path] === 'pending' ? <><button type="button" className="secondary-button" disabled={!!reviewingFile} onClick={() => onFileDecision(file.path, 'accept')}>Accept changes</button><button type="button" className="secondary-button" disabled={!!reviewingFile} onClick={() => onFileDecision(file.path, 'remove')}>Remove changes</button></> : <span className="file-review-status">{fileReview.files[file.path] === 'accepted' ? 'Accepted' : fileReview.files[file.path] === 'removed' ? 'Removed' : 'Updating…'}</span>}
      </div>}
      <div className="gitdiff-body" role="region" aria-label={`Changes in ${file.path}`}>
        {file.status === 'renamed' && file.oldPath && <div className="gitdiff-metadata">Renamed from {file.oldPath}</div>}
        {file.metadata.length > 0 && <div className="gitdiff-metadata">{file.metadata.map((line, lineIndex) => <div key={lineIndex}>{line}</div>)}</div>}
        {file.rows.length > 0 ? file.rows.map((row, rowIndex) => <DiffRow row={row} key={rowIndex} />) : <div className="gitdiff-metadata">No text changes to display.</div>}
      </div>
    </details>)}</div>
  </div>;
}
