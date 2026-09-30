function cleanPath(value) {
  if (!value || value === '/dev/null') return null;
  const path = value.split('\t')[0].trim().replace(/^"|"$/g, '');
  return path.replace(/^[ab]\//, '');
}

function fileFromHeader(line) {
  const paths = line.match(/^diff --git "(a\/.*?)" "(b\/.*?)"$/) || line.match(/^diff --git (.+?) (b\/.+)$/);
  return {
    oldPath: cleanPath(paths?.[1]),
    newPath: cleanPath(paths?.[2]),
    path: cleanPath(paths?.[2]) || 'Changed file',
    status: 'modified',
    metadata: [],
    rows: [],
    additions: 0,
    deletions: 0,
  };
}

export function parseGitDiff(patch) {
  if (!patch?.trim()) return [];
  const files = [];
  let file = null;
  let oldLine = null;
  let newLine = null;

  for (const line of patch.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('diff --git ')) {
      file = fileFromHeader(line);
      files.push(file);
      oldLine = null;
      newLine = null;
      continue;
    }
    if (!file) {
      file = fileFromHeader('diff --git a/patch b/patch');
      files.push(file);
    }
    if (oldLine === null) {
      if (line.startsWith('--- ')) { file.oldPath = cleanPath(line.slice(4)); continue; }
      if (line.startsWith('+++ ')) { file.newPath = cleanPath(line.slice(4)); file.path = file.newPath || file.oldPath || file.path; continue; }
      if (line.startsWith('new file mode ')) { file.status = 'added'; continue; }
      if (line.startsWith('deleted file mode ')) { file.status = 'deleted'; continue; }
      if (line.startsWith('rename from ')) { file.status = 'renamed'; file.oldPath = cleanPath(line.slice(12)); continue; }
      if (line.startsWith('rename to ')) { file.newPath = cleanPath(line.slice(10)); file.path = file.newPath || file.path; continue; }
      if (line.startsWith('index ')) continue;
    }
    const hunk = line.match(/^@@ -(?<old>\d+)(?:,\d+)? \+(?<new>\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldLine = Number(hunk.groups.old);
      newLine = Number(hunk.groups.new);
      file.rows.push({ type: 'hunk', text: line });
      continue;
    }
    if (oldLine !== null && newLine !== null) {
      if (line.startsWith('+')) { file.rows.push({ type: 'add', text: line.slice(1), oldNumber: null, newNumber: newLine++ }); file.additions++; continue; }
      if (line.startsWith('-')) { file.rows.push({ type: 'remove', text: line.slice(1), oldNumber: oldLine++, newNumber: null }); file.deletions++; continue; }
      if (line.startsWith(' ')) { file.rows.push({ type: 'context', text: line.slice(1), oldNumber: oldLine++, newNumber: newLine++ }); continue; }
      if (line.startsWith('\\ No newline')) { file.rows.push({ type: 'note', text: line }); continue; }
    }
    if (line) file.metadata.push(line);
  }
  return files;
}
