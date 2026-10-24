import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { once } from 'node:events';
import {
  endpointCall,
  endpointPayload,
  installEndpointComparison,
  endpointUrls,
  urlsForModel,
} from './endpoint-comparison';
import { endpointMetrics } from '../shared/endpoint-comparison';
import { unseenCases } from './benchmark-data';
const c = unseenCases()[0];
const reply = {
  route: c.expected,
  summary: 'Fictional concern.',
  reason: 'Test reason.',
  nextStep: 'Test step.',
  safetyNet: 'Test advice.',
  needsReview: false,
};
const response = () =>
  new Response(
    JSON.stringify({
      id: 'reply-1',
      model: 'gpt-6-luna',
      choices: [{ message: { content: JSON.stringify(reply) } }],
      usage: { prompt_tokens: 100, completion_tokens: 40 },
    }),
    { headers: { 'x-middleware-request-id': 'mreq_test', 'x-request-id': 'req_test' } },
  );

test('Haiku uses matching Anthropic requests, separate keys, metadata-only evaluation and correct usage fields', async () => {
  const sent: { url: string; init: RequestInit }[] = [];
  const mock = (async (url: any, init: any) => {
    sent.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        id: 'haiku-reply',
        model: 'claude-haiku-4-5-20251001',
        content: [{ type: 'text', text: JSON.stringify(reply) }],
        usage: { input_tokens: 120, output_tokens: 60 },
      }),
      { headers: { 'x-middleware-request-id': 'haiku-receipt' } },
    );
  }) as typeof fetch;
  const results = [];
  for (const side of ['openai', 'mubit'] as const)
    results.push(
      await endpointCall(
        side,
        c,
        'claude-haiku-4-5',
        'fixed task',
        side === 'openai' ? 'sk-ant-test' : 'mbt_test',
        new AbortController().signal,
        mock,
      ),
    );
  assert.equal(sent[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(sent[1].url, 'https://api.mubit.ai/anthropic/v1/messages');
  assert.equal(sent[0].init.body, sent[1].init.body);
  assert.deepEqual(JSON.parse(String(sent[0].init.body)), {
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    system: 'fixed task',
    messages: [{ role: 'user', content: JSON.stringify(c.input) }],
  });
  assert.equal(new Headers(sent[0].init.headers).get('x-api-key'), 'sk-ant-test');
  assert.equal(new Headers(sent[1].init.headers).get('x-api-key'), 'mbt_test');
  assert.equal(new Headers(sent[0].init.headers).get('anthropic-version'), '2023-06-01');
  assert.equal(new Headers(sent[1].init.headers).get('x-middleware-record'), 'metadata');
  assert.equal(results[0].serving, 'direct-anthropic');
  assert.equal(results[1].serving, 'unverified-auto-routing');
  assert.equal(results[1].inputTokens, 120);
  assert.equal(results[1].outputTokens, 60);
  assert.equal(results[0].status, 'success');
  assert.equal(results[1].status, 'success');
  assert.equal(results[1].costUsd, null);
  assert.equal(urlsForModel('gpt-6-luna'), endpointUrls);
});

test('same JSON goes to two distinct endpoints with separate keys; eval content cannot train', async () => {
  const sent: { url: string; init: RequestInit }[] = [];
  const mock = (async (url: any, init: any) => {
    sent.push({ url: String(url), init });
    return response();
  }) as typeof fetch;
  for (const side of ['openai', 'mubit'] as const)
    await endpointCall(
      side,
      c,
      'gpt-6-luna',
      'fixed instructions',
      side === 'openai' ? 'sk_test' : 'mbt_test',
      new AbortController().signal,
      mock,
    );
  assert.equal(sent[0].url, endpointUrls.openai);
  assert.equal(sent[1].url, endpointUrls.mubit);
  assert.equal(sent[0].init.body, sent[1].init.body);
  assert.equal(new Headers(sent[0].init.headers).get('authorization'), 'Bearer sk_test');
  assert.equal(new Headers(sent[1].init.headers).get('authorization'), 'Bearer mbt_test');
  assert.equal(new Headers(sent[1].init.headers).get('x-middleware-record'), 'metadata');
  assert.equal(new Headers(sent[0].init.headers).get('x-middleware-record'), null);
  assert.deepEqual(
    JSON.parse(String(sent[0].init.body)),
    endpointPayload('gpt-6-luna', 'fixed instructions', c.input),
  );
  assert.equal(JSON.parse(String(sent[0].init.body)).expected, undefined);
});
test('gateway model and receipt never masquerade as verified adapter serving or known cost', async () => {
  const r = await endpointCall(
    'mubit',
    c,
    'gpt-6-luna',
    'prompt',
    'mbt_test',
    new AbortController().signal,
    (async () => response()) as typeof fetch,
  );
  assert.equal(r.status, 'success');
  assert.equal(r.serving, 'unverified-auto-routing');
  assert.equal(r.modelReturned, 'gpt-6-luna');
  assert.equal(r.costUsd, null);
  assert.equal(r.requestId, 'mreq_test');
  assert.equal(r.inputTokens, 100);
  assert.equal(r.outputTokens, 40);
});
test('missing gateway receipt is an attribution failure; invalid output and HTTP failures preserve evidence', async () => {
  const missing = await endpointCall(
    'mubit',
    c,
    'gpt-6-luna',
    'prompt',
    'mbt_test',
    new AbortController().signal,
    (async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }),
      )) as typeof fetch,
  );
  assert.equal(missing.status, 'error');
  assert.match(missing.error!, /receipt/);
  let calls = 0;
  const failed = await endpointCall(
    'openai',
    c,
    'gpt-6-luna',
    'prompt',
    'sk_test',
    new AbortController().signal,
    (async () => {
      calls++;
      return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded' } }), {
        status: 429,
        headers: { 'x-request-id': 'failed-receipt' },
      });
    }) as typeof fetch,
  );
  assert.equal(calls, 1);
  assert.equal(failed.status, 'error');
  assert.equal(failed.requestId, 'failed-receipt');
  assert.equal(failed.costUsd, null);
  const invalid = await endpointCall(
    'openai',
    c,
    'gpt-6-luna',
    'prompt',
    'sk_test',
    new AbortController().signal,
    (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'not JSON' } }],
          usage: { prompt_tokens: 15, completion_tokens: 3 },
        }),
      )) as typeof fetch,
  );
  assert.equal(invalid.status, 'error');
  assert.equal(invalid.reply, 'not JSON');
  assert.equal(invalid.outputTokens, 3);
  assert.equal(endpointMetrics([failed, invalid], unseenCases()).accuracy, 0);
});
test('direct side refuses a Mubit key without sending it to OpenAI', async () => {
  let calls = 0;
  const r = await endpointCall(
    'openai',
    c,
    'gpt-6-luna',
    'prompt',
    'mbt_test',
    new AbortController().signal,
    (async () => {
      calls++;
      return response();
    }) as typeof fetch,
  );
  assert.equal(calls, 0);
  assert.equal(r.status, 'error');
});
test('new comparison storage preserves historical results and exposes no keys', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE comparisons(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
  const historic = JSON.stringify({
    id: 'run-old',
    createdAt: '2026-10-24',
    results: [{ caseId: 'U-001' }],
  });
  db.prepare('INSERT INTO comparisons VALUES(?,?)').run('run-old', historic);
  const app = express();
  app.use(express.json());
  installEndpointComparison(app, db);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const addr = server.address() as { port: number };
  const url = `http://127.0.0.1:${addr.port}/api/staff/endpoint-comparison`;
  try {
    const state = (await (await fetch(url)).json()) as any;
    assert.equal(state.cases.length, 100);
    assert.equal(state.historical[0].attempted, 1);
    assert.equal(typeof state.configured.openai, 'boolean');
    assert.equal(state.openai, undefined);
    const run = (await (
      await fetch(url + '/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-6-luna' }),
      })
    ).json()) as any;
    assert.equal(run.status, 'ready');
    assert.equal(run.results.length, 0);
    assert.equal(
      db.prepare('SELECT data FROM comparisons WHERE id=?').get('run-old')!.data,
      historic,
    );
  } finally {
    server.close();
    db.close();
  }
});
