import DiffRow from './DiffRow.jsx';
import FileReviewActions from './FileReviewActions.jsx';

function fileLabel(path) {
  const extension = path.split('.').pop()?.toUpperCase();
  return extension && extension.length <= 4 && extension !== path.toUpperCase() ? extension : 'FILE';
}


export default function DiffFile({ file, fileReview, onFileDecision, reviewingFile }) {
  return (
    <details className="gitdiff-file" open>
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
      <FileReviewActions file={file} fileReview={fileReview} onFileDecision={onFileDecision} reviewingFile={reviewingFile} />

      {/* Diff Lines Body */}
      <div className="gitdiff-body" role="region" aria-label={`Changes in ${file.path}`}>
        {file.status === 'renamed' && file.oldPath && (
          <div className="gitdiff-metadata">Renamed from {file.oldPath}</div>
        )}
        {file.metadata.length > 0 && (
          <div className="gitdiff-metadata">
            {file.metadata.map((line, index) => <div key={index}>{line}</div>)}
          </div>
        )}
        {file.rows.length > 0 ? (
          file.rows.map((row, index) => <DiffRow row={row} key={index} />)
        ) : (
          <div className="gitdiff-metadata">No text changes to display.</div>
        )}
      </div>
    </details>
  );
}
