import type { Express } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { z } from 'zod';
import { instructions, decisionSchema } from './navigation';
import { unseenCases, hash } from './benchmark-data';
import type { BenchmarkCase, BenchmarkRun } from '../shared/benchmark';
import type { EndpointSide, EndpointResult, EndpointRun } from '../shared/endpoint-comparison';

const root = '/api/staff/endpoint-comparison';
export const endpointUrls = {
  openai: 'https://api.openai.com/v1/chat/completions',
  mubit: 'https://api.mubit.ai/openai/v1/chat/completions',
};
export const usesAnthropic = (model: string) => model.startsWith('claude-');
export const urlsForModel = (model: string) =>
  usesAnthropic(model)
    ? {
        openai: 'https://api.anthropic.com/v1/messages',
        mubit: 'https://api.mubit.ai/anthropic/v1/messages',
      }
    : endpointUrls;
// Read local additions without requiring a restart; never return credentials to the client.
function settings() {
  let local: Record<string, string> = {};
  try {
    local = parse(readFileSync('.env'));
  } catch {}
  const value = (name: string) => process.env[name] || local[name] || '';
  const direct = value('OPENAI_API_KEY');
  return {
    openai: direct.startsWith('mbt_') ? '' : direct,
    mubit: value('MUBIT_API_KEY'),
    anthropic: value('ANTHROPIC_API_KEY').startsWith('mbt_') ? '' : value('ANTHROPIC_API_KEY'),
    model: value('COMPARISON_MODEL') || 'claude-haiku-4-5',
  };
}
export function endpointPayload(model: string, prompt: string, input: BenchmarkCase['input']) {
  if (usesAnthropic(model))
    return {
      model,
      max_tokens: 1200,
      system: prompt,
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    };
  return {
    model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(input) },
    ],
  };
}
export async function endpointCall(
  side: EndpointSide,
  c: BenchmarkCase,
  model: string,
  prompt: string,
  key: string,
  signal: AbortSignal,
  send: typeof fetch = fetch,
): Promise<EndpointResult> {
  const start = performance.now(),
    anthropic = usesAnthropic(model),
    provider = anthropic ? 'Anthropic' : 'OpenAI';
  const result: EndpointResult = {
    caseId: c.id,
    side,
    status: 'error',
    at: new Date().toISOString(),
    latencyMs: 0,
    modelRequested: model,
    modelReturned: null,
    requestId: null,
    responseId: null,
    httpStatus: null,
    reply: '',
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
    costBasis: 'unknown',
    serving:
      side === 'openai'
        ? anthropic
          ? 'direct-anthropic'
          : 'direct-openai'
        : 'unverified-auto-routing',
    evidence: {},
  };
  try {
    if (!key)
      throw Error(
        side === 'openai'
          ? `Add ${anthropic ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} to the server .env file.`
          : 'Add MUBIT_API_KEY to the server .env file.',
      );
    if (side === 'openai' && key.startsWith('mbt_'))
      throw Error(`A direct ${provider} key is required; a Mubit key cannot be used on the left.`);
    const response = await send(urlsForModel(model)[side], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anthropic
          ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
          : { Authorization: `Bearer ${key}` }),
        ...(side === 'mubit' ? { 'x-middleware-record': 'metadata' } : {}),
      },
      body: JSON.stringify(endpointPayload(model, prompt, c.input)),
      signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
    });
    result.httpStatus = response.status;
    result.requestId =
      response.headers.get('x-middleware-request-id') ||
      response.headers.get('x-request-id') ||
      response.headers.get('request-id');
    // Record routing-related response headers as evidence, without guessing their semantics.
    // Neither a matching model name nor a Mubit request ID proves adapter execution.
    response.headers.forEach((value, name) => {
      if (/^x-middleware-/.test(name) && !/(key|token|auth|cookie|secret)/i.test(name))
        result.evidence[name] = value.slice(0, 1000);
    });
    const raw = (await response.json()) as any;
    result.modelReturned = typeof raw.model === 'string' ? raw.model : null;
    result.responseId = typeof raw.id === 'string' ? raw.id : null;
    const usage = raw.usage || {};
    const finite = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
    result.inputTokens = finite(anthropic ? usage.input_tokens : usage.prompt_tokens);
    result.outputTokens = finite(anthropic ? usage.output_tokens : usage.completion_tokens);
    if (!response.ok) {
      const code = typeof raw.error?.code === 'string' ? raw.error.code : '';
      throw Error(`HTTP ${response.status}${code ? ' · ' + code : ''}. No retry sent.`);
    }
    result.reply = anthropic
      ? raw.content
          ?.filter((v: any) => v.type === 'text')
          .map((v: any) => v.text)
          .join('') || ''
      : typeof raw.choices?.[0]?.message?.content === 'string'
        ? raw.choices[0].message.content
        : '';
    if (side === 'mubit' && !response.headers.get('x-middleware-request-id'))
      throw Error('Mubit did not return its request receipt. Attribution could not be verified.');
    const text = result.reply;
    const decision = decisionSchema.parse(
      JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)),
    );
    result.route = decision.route;
    result.status = 'success';
  } catch (e) {
    result.error = signal.aborted
      ? 'Stopped before completion. The provider may still charge for the request.'
      : e instanceof z.ZodError
        ? 'The reply did not match the required care-navigation format.'
        : e instanceof SyntaxError
          ? 'The endpoint returned invalid JSON.'
          : (e as Error).message;
  }
  result.latencyMs = Math.round(performance.now() - start);
  return result;
}

export function installEndpointComparison(app: Express, db: DatabaseSync) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS endpoint_comparisons(id TEXT PRIMARY KEY,data TEXT NOT NULL)',
  );
  const get = (id: string) => {
    const r = db.prepare('SELECT data FROM endpoint_comparisons WHERE id=?').get(id);
    return r ? (JSON.parse(String(r.data)) as EndpointRun) : undefined;
  };
  const put = (r: EndpointRun) =>
    db
      .prepare('INSERT OR REPLACE INTO endpoint_comparisons VALUES(?,?)')
      .run(r.id, JSON.stringify(r));
  const runs = () =>
    db
      .prepare(
        "SELECT data FROM endpoint_comparisons ORDER BY json_extract(data,'$.createdAt') DESC",
      )
      .all()
      .map((r) => JSON.parse(String(r.data)) as EndpointRun);
  // Reuse the immutable held-out cases, never the teaching cases or expected labels in prompts.
  const saved = db.prepare("SELECT data FROM comparisons WHERE id='dataset'").get();
  const cases: BenchmarkCase[] = saved ? JSON.parse(String(saved.data)).cases : unseenCases();
  const datasetHash = hash(cases);
  for (const run of runs().filter((r) => r.status === 'running'))
    put({ ...run, status: 'paused', note: 'Server restarted. Completed results are preserved.' });
  let active: { id: string; abort: AbortController } | null = null;
  app.get(root, (_req, res) => {
    const config = settings();
    res.json({
      cases,
      runs: runs(),
      model: config.model,
      configured: { openai: !!config.openai, anthropic: !!config.anthropic, mubit: !!config.mubit },
      activeRunId: active?.id || null,
      historical: db
        .prepare("SELECT data FROM comparisons WHERE id LIKE 'run-%'")
        .all()
        .map((r) => {
          const v = JSON.parse(String(r.data)) as BenchmarkRun;
          return { id: v.id, createdAt: v.createdAt, attempted: v.results.length };
        }),
    });
  });
  app.post(root + '/runs', (req, res) => {
    if (active)
      return res.status(409).json({ error: 'Stop or finish the active comparison first.' });
    const p = z
      .object({
        model: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .regex(/^[a-zA-Z0-9_.-]+$/),
      })
      .parse(req.body);
    const run: EndpointRun = {
      id: 'endpoint-' + randomUUID(),
      model: p.model,
      instructions,
      datasetHash,
      promptHash: hash(instructions),
      createdAt: new Date().toISOString(),
      status: 'ready',
      results: [],
    };
    put(run);
    res.status(201).json(run);
  });
  app.post(root + '/runs/:id/start', (req, res) => {
    const p = z
      .object({
        side: z.enum(['openai', 'mubit', 'both']),
        count: z.union([z.literal(1), z.literal(5), z.literal(25), z.literal(100)]),
      })
      .parse(req.body);
    const run = get(String(req.params.id));
    if (!run) return res.status(404).json({ error: 'Comparison not found.' });
    if (active) return res.status(409).json({ error: 'A comparison is already running.' });
    if (run.datasetHash !== datasetHash || run.promptHash !== hash(instructions))
      return res
        .status(409)
        .json({ error: 'The dataset or instructions changed. Create a new comparison.' });
    const config = settings(),
      sides: EndpointSide[] = p.side === 'both' ? ['openai', 'mubit'] : [p.side];
    const keys = {
      openai: usesAnthropic(run.model) ? config.anthropic : config.openai,
      mubit: config.mubit,
    };
    for (const s of sides)
      if (!keys[s])
        return res
          .status(409)
          .json({
            error:
              s === 'openai'
                ? `Add a direct ${usesAnthropic(run.model) ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} to the server .env file first.`
                : 'MUBIT_API_KEY is missing.',
          });
    // Choose case IDs first so both endpoints receive exactly the same cases.
    const pending = cases
      .filter((c) => sides.some((s) => !run.results.some((r) => r.side === s && r.caseId === c.id)))
      .slice(0, p.count);
    if (!pending.length)
      return res
        .status(409)
        .json({
          error:
            'No unattempted cases remain for this selection. Create a new comparison to repeat them.',
        });
    const abort = new AbortController();
    active = { id: run.id, abort };
    run.status = 'running';
    run.note = undefined;
    put(run);
    res.json(run);
    void (async () => {
      let failures = 0;
      try {
        for (const c of pending) {
          if (abort.signal.aborted || failures >= 3) break;
          await Promise.all(
            sides
              .filter((s) => !run.results.some((r) => r.side === s && r.caseId === c.id))
              .map(async (side) => {
                const result = await endpointCall(
                  side,
                  c,
                  run.model,
                  run.instructions,
                  keys[side],
                  abort.signal,
                );
                run.results.push(result);
                if (result.status === 'error') failures++;
                put(run);
              }),
          );
        }
      } finally {
        run.status = run.results.length === cases.length * 2 ? 'complete' : 'paused';
        run.note = abort.signal.aborted
          ? 'Stopped. Completed results are preserved.'
          : failures >= 3
            ? 'Paused after repeated errors. Inspect the receipts before continuing.'
            : undefined;
        put(run);
        active = null;
      }
    })();
  });
  app.post(root + '/runs/:id/stop', (req, res) => {
    if (active?.id === req.params.id) active.abort.abort();
    res.json({ ok: true });
  });
  app.get(root + '/runs/:id/export', (req, res) => {
    const run = get(String(req.params.id));
    if (!run) return res.status(404).json({ error: 'Comparison not found.' });
    res.setHeader('Content-Disposition', 'attachment; filename="wellby-endpoint-comparison.json"');
    res.json({
      schemaVersion: 2,
      run,
      cases,
      endpoints: urlsForModel(run.model),
      methodology:
        'Same model, instructions and inputs. Mubit automatic routing is not proof of adapter serving. Evaluation content is not stored by Mubit. Costs are unknown unless separately verified. Illustrative labels are not clinical validation.',
    });
  });
}
