import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGitDiff } from '../src/parseGitDiff.js';

test('groups files and numbers added, removed, and context lines', () => {
  const patch = `diff --git a/src/one.js b/src/one.js
index 1111111..2222222 100644
--- a/src/one.js
+++ b/src/one.js
@@ -4,2 +4,3 @@
 same
-old
+new
+extra
@@ -12 +13 @@
-before
+after
diff --git a/src/two.js b/src/two.js
new file mode 100644
--- /dev/null
+++ b/src/two.js
@@ -0,0 +1 @@
+hello`;
  const files = parseGitDiff(patch);
  assert.equal(files.length, 2);
  assert.equal(files[0].path, 'src/one.js');
  assert.deepEqual([files[0].additions, files[0].deletions], [3, 2]);
  assert.deepEqual(files[0].rows.filter((row) => row.type !== 'hunk').map((row) => [row.type, row.oldNumber, row.newNumber]), [
    ['context', 4, 4], ['remove', 5, null], ['add', null, 5], ['add', null, 6], ['remove', 12, null], ['add', null, 13],
  ]);
  assert.equal(files[1].status, 'added');
  assert.equal(files[1].oldPath, null);
  assert.equal(files[1].rows[1].newNumber, 1);
});

test('keeps patch content that resembles file headers inside a hunk', () => {
  const patch = `diff --git a/example.txt b/example.txt
--- a/example.txt
+++ b/example.txt
@@ -1 +1 @@
--- removed heading
+++ added heading
\\ No newline at end of file`;
  const [file] = parseGitDiff(patch);
  assert.deepEqual(file.rows.map((row) => row.type), ['hunk', 'remove', 'add', 'note']);
  assert.equal(file.path, 'example.txt');
});

test('shows renamed and binary files without text hunks', () => {
  const patch = `diff --git a/old.png b/new.png
similarity index 100%
rename from old.png
rename to new.png
Binary files a/old.png and b/new.png differ`;
  const [file] = parseGitDiff(patch);
  assert.equal(file.status, 'renamed');
  assert.equal(file.oldPath, 'old.png');
  assert.equal(file.path, 'new.png');
  assert.equal(file.rows.length, 0);
  assert.ok(file.metadata.some((line) => line.startsWith('Binary files')));
});
