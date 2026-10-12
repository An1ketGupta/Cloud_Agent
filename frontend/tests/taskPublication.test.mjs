import assert from 'node:assert/strict';
import test from 'node:test';
import { publicationState, recordPullRequest, taskResult } from '../src/utils/taskPublication.js';

function task(id, result) {
  return { id, conversation: [{ id: id + 100, response: JSON.stringify(result) }] };
}

test('unloaded conversations and malformed older responses do not block publication', () => {
  assert.deepEqual(publicationState(undefined), { latestTaskId: 0, publicationBusy: false });
  assert.equal(taskResult({ conversation: [{ response: 'older plain text response' }] }), null);
  assert.equal(taskResult({}), null);
  assert.deepEqual(publicationState({ tasks: [{ id: 4, conversation: [{ response: '{' }] }] }), {
    latestTaskId: 4, publicationBusy: false,
  });
});

test('publication uses the newest task even when tasks arrive out of order', () => {
  assert.deepEqual(publicationState({ tasks: [task(8, {}), task(2, {}), task(5, {})] }), {
    latestTaskId: 8, publicationBusy: false,
  });
});

test('a publication on any task blocks concurrent workspace mutations', () => {
  assert.deepEqual(publicationState({ tasks: [
    task(8, {}), task(2, { pullRequest: { status: 'creating' } }),
  ] }), { latestTaskId: 8, publicationBusy: true });
  for (const status of ['created', 'failed']) {
    assert.equal(publicationState({ tasks: [task(8, { pullRequest: { status } })] }).publicationBusy, false);
  }
});

test('recording publication preserves patch, file reviews, execution and other tasks', () => {
  const result = { patch: 'diff', fileReview: { files: { 'app.js': 'accepted' } } };
  const publishedTask = task(8, result);
  const extraQuery = { id: 200, response: 'another response' };
  publishedTask.conversation.push(extraQuery);
  const otherTask = task(2, {});
  const data = { execution: { 8: { state: 'completed' } }, conversation: {
    id: 1, title: 'Fix app', messages: [], tasks: [otherTask, publishedTask],
  } };
  const pullRequest = { status: 'created', number: 3, url: 'https://github.com/example/repo/pull/3' };
  const updated = recordPullRequest(data, 1, 8, pullRequest);
  assert.deepEqual(taskResult(updated.conversation.tasks[1]), { ...result, pullRequest });
  assert.deepEqual(taskResult(publishedTask), result);
  assert.equal(updated.execution, data.execution);
  assert.equal(updated.conversation.tasks[0], otherTask);
  assert.equal(updated.conversation.tasks[1].conversation[1], extraQuery);
  assert.equal(updated.conversation.messages, data.conversation.messages);
});

test('a late publication result cannot overwrite a different conversation', () => {
  const data = { conversation: { id: 2, tasks: [task(8, {})] } };
  assert.equal(recordPullRequest(data, 1, 8, { status: 'created' }), data);
  assert.equal(recordPullRequest(null, 1, 8, {}), null);
});
