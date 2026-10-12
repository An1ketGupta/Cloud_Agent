export default function DiffRow({ row }) {
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
