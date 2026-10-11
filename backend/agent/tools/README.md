# Repository editing

Developers normally use one file per call:

- `CreateFile({path, content, requestId?})` creates a new UTF-8 file.
- `EditFile({path, revision, edits: [{before, after}], requestId?})` updates an existing file.
- `DeleteFile({path, revision, requestId?})` deletes an existing file.

Copy the full SHA-256 revision from `ReadFile` or the most recent successful edit.
Paths are repository-relative and use `/` separators. Single-file tools do not
accept a `type` field. `before` is nonempty; an empty `after` deletes the matched
block. Include surrounding code for insertions and repeated blocks.

`ApplyPatch({operations, requestId?})` remains available when multiple files must
change atomically. Each operation has `type: create`, `update`, or `delete` and
the corresponding fields. A failed batch changes none of its files. Successful
requests return file revisions, matching strategies, and a replay receipt.

## Matching and recovery

The engine tries an exact match first, normalizing CRLF/LF for matching. Fallbacks
compare complete lines, first ignoring trailing spaces/tabs, then allowing one
consistent indentation offset. Relative indentation and internal text must
agree. Every selected strategy requires a unique match. Replacement indentation
is rebased consistently; existing line endings and untouched text are preserved.

Similarity scoring only returns candidate code. It never applies approximate
matches. A mismatch includes the failed edit, index, current revision, and up to
three bounded candidate excerpts with line numbers and character offsets.

Content/revision conflicts trigger an automatic bounded `ReadFile` call, near
the best candidate when available. `recovery.status: read` includes the actual
current file page and revision. Correct the edit using that result. Read another
page if the target code is outside it. If recovery fails, the file must be read
before another write is attempted. The backend never blindly retries an edit or
replaces its supplied revision.

A successful earlier call must not be repeated. A failed atomic batch must be
resubmitted with all still-needed operations after correcting its failure.

## Limits and diagnostics

The default limits are four consecutive failures per file and 24 failed mutation
attempts across a task. These counts are shared across developer and revision
roles. Successful edits reset that file's consecutive count; successful reads
do not. Recovery-only rejections and blocked identical retries do not spend a
mutation attempt. Role time and tool-round limits also remain in force.

Task progress includes bounded failed-edit snippets, remaining allowances, and
automatic reread status. Successful whitespace fallbacks report path, strategy,
and line number. Existing revision, path, transaction, rollback, and replay
protections are shared by all mutation tools.

Run `pnpm test` (or `node --test`) from `backend` to verify matching, ambiguity rejection, rollback,
revision handling, recovery across six files, shared task limits, the real
container helper protocol, and the developer loop. Tests use temporary Git
repositories, a local child process for the container protocol, and scripted
model responses; they do not call Gemini or require Docker.
