import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationApi } from '../src/api/conversationApi.js';

function mockResponses(t, responses) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options });
    const next = responses.shift();
    assert.ok(next, 'Unexpected extra request');
    return new Response(JSON.stringify(next.body), {
      status: next.status || 200, headers: { 'Content-Type': 'application/json' },
    });
  });
  return calls;
}

test('PR options use the conversation task endpoint and include the session cookie', async (t) => {
  const options = { branches: ['main'], base: 'main' };
  const calls = mockResponses(t, [{ body: options }]);
  assert.deepEqual(await conversationApi.pullRequestOptions(12, 34), options);
  assert.equal(calls[0].url, '/conversations/12/tasks/34/pull-request');
  assert.equal(calls[0].credentials, 'include');
});

test('creating a PR sends all dialog fields without changing their values', async (t) => {
  const details = { title: 'Fix app', body: 'First line\nSecond line', base: 'main', branch: 'fix/app', draft: true };
  const pullRequest = { status: 'created', number: 3 };
  const calls = mockResponses(t, [{ status: 201, body: { pullRequest } }]);
  assert.deepEqual(await conversationApi.createPullRequest(12, 34, details), { pullRequest });
  assert.equal(calls[0].url, '/conversations/12/tasks/34/pull-request');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].credentials, 'include');
  assert.equal(calls[0].headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].body), details);
});

test('an expired session refreshes before retrying the same PR request', async (t) => {
  const details = { title: 'Fix app', body: '', base: 'main', branch: 'fix/app', draft: false };
  const calls = mockResponses(t, [
    { status: 401, body: { error: 'Expired' } }, { body: {} },
    { status: 201, body: { pullRequest: { number: 3 } } },
  ]);
  await conversationApi.createPullRequest(12, 34, details);
  assert.deepEqual(calls.map((call) => call.url), [
    '/conversations/12/tasks/34/pull-request', '/auth/refresh', '/conversations/12/tasks/34/pull-request',
  ]);
  assert.equal(calls[1].method, 'POST');
  assert.deepEqual(calls[0], calls[2]);
});

test('PR conflicts reach the dialog without automatically retrying publication', async (t) => {
  const calls = mockResponses(t, [{ status: 409, body: { error: 'Wait for the current response.' } }]);
  await assert.rejects(conversationApi.createPullRequest(12, 34, {}), {
    message: 'Wait for the current response.', status: 409,
  });
  assert.equal(calls.length, 1);
});

test('repository syncing uses the conversation API after removal of taskApi', async (t) => {
  const calls = mockResponses(t, [{ body: {} }]);
  await conversationApi.syncRepositories();
  assert.equal(calls[0].url, '/auth/github/sync');
  assert.equal(calls[0].method, 'POST');
});

test('file reviews retain the conversation task endpoint and payload', async (t) => {
  const calls = mockResponses(t, [{ body: { status: 'removed' } }]);
  await conversationApi.reviewFile(12, 34, 'src/app.js', 'remove');
  assert.equal(calls[0].url, '/conversations/12/tasks/34/files/review');
  assert.deepEqual(JSON.parse(calls[0].body), { path: 'src/app.js', decision: 'remove' });
});
