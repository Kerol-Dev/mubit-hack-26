import type { Express } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { instructions, decisionSchema } from './navigation';
import { history } from './data';
import { hash, unseenCases } from './benchmark-data';
import type { BenchmarkCase, BenchmarkRun, Measurement } from '../shared/benchmark';
const consoleUrl = process.env.MUBIT_CONSOLE_URL || 'https://app.mubit.ai/console/';
const priceSource = 'https://platform.claude.com/docs/en/about-claude/pricing';
const model = () => process.env.MUBIT_MODEL || 'claude-haiku-4-5';
const transport = () => (process.env.ANTHROPIC_API_KEY ? 'direct' : 'gateway');
const promptHash = () => hash(instructions);
export const importedSchema = z.object({
  datasetHash: z.string(),
  promptHash: z.string(),
  adapterVersion: z.string().min(1).max(180),
  evidenceUrl: z
    .string()
    .url()
    .refine((s) => new URL(s).hostname === 'app.mubit.ai', 'Use a Mubit console evidence link.'),
  results: z
    .array(
      z.object({
        caseId: z.string(),
        inputHash: z.string(),
        status: z.enum(['success', 'error']).default('success'),
        reply: z.string().max(12000).optional(),
        error: z.string().max(1000).optional(),
        latencyMs: z.number().nonnegative().max(3600000).nullable(),
        inputTokens: z.number().int().nonnegative().nullable(),
        outputTokens: z.number().int().nonnegative().nullable(),
        costUsd: z.number().nonnegative().max(100).nullable(),
        requestId: z.string().min(1).max(300),
      }),
    )
    .min(1)
    .max(100),
});
export function validateImport(
  payload: unknown,
  cases: BenchmarkCase[],
  datasetHash: string,
  pHash: string,
): Measurement[] {
  const data = importedSchema.parse(payload);
  if (data.datasetHash !== datasetHash || data.promptHash !== pHash)
    throw Error(
      'These results belong to a different dataset or prompt. Import them into the matching run.',
    );
  const ids = new Set<string>();
  return data.results.map((r) => {
    const c = cases.find((c) => c.id === r.caseId);
    if (!c || c.inputHash !== r.inputHash) throw Error(`Input mismatch for ${r.caseId}.`);
    if (ids.has(r.caseId)) throw Error(`Duplicate result for ${r.caseId}.`);
    ids.add(r.caseId);
    if (r.status === 'error' && !r.error)
      throw Error(`Include the failure reason for ${r.caseId}.`);
    if (r.status === 'success' && !r.reply) throw Error(`Include the reply for ${r.caseId}.`);
    const parsed =
      r.status === 'success'
        ? decisionSchema.parse(
            JSON.parse(r.reply!.slice(r.reply!.indexOf('{'), r.reply!.lastIndexOf('}') + 1)),
          )
        : null;
    return {
      caseId: r.caseId,
      side: 'adapter',
      status: r.status,
      route: parsed?.route,
      reply: r.reply,
      error: r.error,
      latencyMs: r.latencyMs,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      costUsd: r.costUsd,
      costKind: r.costUsd === null ? 'unknown' : 'reported',
      model: data.adapterVersion,
      adapterVersion: data.adapterVersion,
      requestId: r.requestId,
      evidenceUrl: data.evidenceUrl,
      at: new Date().toISOString(),
      provenance: 'console-import',
      latencyBasis: 'console-reported',
    };
  });
}
export async function baselineCall(
  c: BenchmarkCase,
  signal: AbortSignal,
  runModel = model(),
): Promise<Measurement> {
  const start = performance.now(),
    direct = !!process.env.ANTHROPIC_API_KEY,
    key = direct ? process.env.ANTHROPIC_API_KEY : process.env.MUBIT_API_KEY;
  const base: Measurement = {
    caseId: c.id,
    side: 'baseline',
    status: 'error',
    latencyMs: null,
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
    costKind: 'unknown',
    model: runModel,
    at: new Date().toISOString(),
    provenance: 'api',
    latencyBasis: 'client-roundtrip',
  };
  try {
    const response = await fetch(
      direct
        ? 'https://api.anthropic.com/v1/messages'
        : 'https://api.mubit.ai/anthropic/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key!,
          'anthropic-version': '2023-06-01',
          ...(!direct ? { 'x-middleware-record': 'off' } : {}),
        },
        body: JSON.stringify({
          model: runModel,
          max_tokens: 1200,
          system: instructions,
          messages: [{ role: 'user', content: JSON.stringify(c.input) }],
        }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
      },
    );
    base.requestId =
      response.headers.get('x-middleware-request-id') ||
      response.headers.get('request-id') ||
      undefined;
    if (!response.ok) throw Error(`Model returned HTTP ${response.status}. No retry was sent.`);
    const raw: any = await response.json();
    base.latencyMs = Math.round(performance.now() - start);
    const u = raw.usage || {};
    base.inputTokens = Number.isFinite(u.input_tokens) ? u.input_tokens : null;
    base.outputTokens = Number.isFinite(u.output_tokens) ? u.output_tokens : null;
    if (
      /^claude-haiku-4-5(?:-|$)/.test(raw.model || '') &&
      base.inputTokens !== null &&
      base.outputTokens !== null
    ) {
      const write5 =
          u.cache_creation?.ephemeral_5m_input_tokens ?? u.cache_creation_input_tokens ?? 0,
        write60 = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
      base.costUsd =
        (base.inputTokens +
          base.outputTokens * 5 +
          (u.cache_read_input_tokens || 0) * 0.1 +
          write5 * 1.25 +
          write60 * 2) /
        1e6;
      base.costKind = 'estimate';
    }
    base.model = raw.model || runModel;
    base.reply =
      raw.content
        ?.filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('') || '';
    if (!/^claude-haiku-4-5(?:-|$)/.test(base.model))
      throw Error('Response model differs from the Haiku baseline. Attribution requires review.');
    const text = base.reply!;
    const parsed = decisionSchema.parse(
      JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)),
    );
    return { ...base, status: 'success', route: parsed.route };
  } catch (e) {
    return {
      ...base,
      status: 'error',
      latencyMs: Math.round(performance.now() - start),
      error: signal.aborted
        ? 'Stopped before the response completed; provider usage may still be charged.'
        : e instanceof z.ZodError
          ? 'Response did not match the required output format.'
          : e instanceof SyntaxError
            ? 'Model returned invalid JSON.'
            : (e as Error).message,
    };
  }
}
export function installBenchmark(app: Express, db: DatabaseSync) {
  db.exec('CREATE TABLE IF NOT EXISTS comparisons(id TEXT PRIMARY KEY,data TEXT NOT NULL)');
  const get = <T>(id: string): T | undefined => {
    const row = db.prepare('SELECT data FROM comparisons WHERE id=?').get(id);
    return row ? JSON.parse(String(row.data)) : undefined;
  };
  const put = (id: string, data: unknown) =>
    db.prepare('INSERT OR REPLACE INTO comparisons VALUES (?,?)').run(id, JSON.stringify(data));
  const runs = () =>
    db
      .prepare(
        "SELECT data FROM comparisons WHERE id LIKE 'run-%' ORDER BY json_extract(data,'$.createdAt') DESC",
      )
      .all()
      .map((r) => JSON.parse(String(r.data)) as BenchmarkRun);
  for (const run of runs().filter((r) => r.status === 'running'))
    put(run.id, {
      ...run,
      status: 'paused',
      note: 'Server restarted. Completed results are preserved; resume processes pending cases only.',
    });
  let active: { id: string; abort: AbortController } | null = null;
  const dataset = () => get<{ cases: BenchmarkCase[]; hash: string; createdAt: string }>('dataset');
  app.get('/api/staff/comparison', (_req, res) => {
    const d = dataset();
    res.json({
      cases: d?.cases || [],
      datasetHash: d?.hash || null,
      promptHash: promptHash(),
      instructions,
      runs: runs(),
      baseline: {
        available: !!(process.env.MUBIT_API_KEY || process.env.ANTHROPIC_API_KEY),
        transport: transport(),
        model: model(),
      },
      adapter: {
        available: false,
        reason:
          'Mubit exposes adapter comparisons in its console, not through a documented adapter-selection API. Import measured console results; provider responses are never counted as trained results.',
        consoleUrl,
      },
      pricing: { input: 1, output: 5, currency: 'USD', source: priceSource },
    });
  });
  app.post('/api/staff/comparison/seed', (_req, res) => {
    const existing = dataset();
    if (existing) return res.json(existing);
    const cases = unseenCases();
    if (cases.length !== 100) throw Error('Dataset must contain exactly 100 cases.');
    const training = new Set(history.map((c) => c.input.symptoms.trim().toLowerCase()));
    if (
      new Set(cases.map((c) => c.inputHash)).size !== 100 ||
      cases.some((c) => training.has(c.input.symptoms.trim().toLowerCase()))
    )
      throw Error('Dataset overlap detected.');
    const d = { cases, hash: hash(cases), createdAt: new Date().toISOString() };
    put('dataset', d);
    res.status(201).json(d);
  });
  app.post('/api/staff/comparison/runs', (_req, res) => {
    const d = dataset();
    if (!d) return res.status(409).json({ error: 'Seed the dataset first.' });
    if (active) return res.status(409).json({ error: 'Stop or finish the active run first.' });
    const run: BenchmarkRun = {
      id: 'run-' + randomUUID(),
      datasetHash: d.hash,
      promptHash: promptHash(),
      model: model(),
      createdAt: new Date().toISOString(),
      status: 'ready',
      results: [],
    };
    put(run.id, run);
    res.status(201).json(run);
  });
  app.post('/api/staff/comparison/runs/:id/start', (req, res) => {
    const p = z
        .object({ count: z.union([z.literal(5), z.literal(25), z.literal(100)]) })
        .parse(req.body),
      d = dataset(),
      run = get<BenchmarkRun>(req.params.id);
    if (!run || !d) return res.status(404).json({ error: 'Comparison not found.' });
    if (active) return res.status(409).json({ error: 'A comparison is already running.' });
    if (!process.env.MUBIT_API_KEY && !process.env.ANTHROPIC_API_KEY)
      return res.status(409).json({ error: 'Configure the model connection first.' });
    if (run.promptHash !== promptHash() || run.model !== model() || run.datasetHash !== d.hash)
      return res
        .status(409)
        .json({ error: 'The model, prompt or dataset changed. Create a new comparison.' });
    const pending = d.cases
      .filter((c) => !run.results.some((r) => r.side === 'baseline' && r.caseId === c.id))
      .slice(0, p.count);
    if (!pending.length)
      return res
        .status(409)
        .json({ error: 'No unattempted cases remain. Create a new run to repeat the comparison.' });
    const abort = new AbortController();
    active = { id: run.id, abort };
    run.status = 'running';
    run.note = undefined;
    put(run.id, run);
    res.json(run);
    void (async () => {
      let cursor = 0,
        errors = 0;
      try {
        const worker = async () => {
          while (cursor < pending.length && !abort.signal.aborted && errors < 3) {
            const c = pending[cursor++];
            const result = await baselineCall(c, abort.signal, run.model);
            run.results.push(result);
            if (result.status === 'error') errors++;
            put(run.id, run);
          }
        };
        await Promise.all([worker(), worker()]);
      } finally {
        run.status =
          run.results.filter((r) => r.side === 'baseline').length === d.cases.length
            ? 'complete'
            : 'paused';
        run.finishedAt = new Date().toISOString();
        if (errors >= 3)
          run.note =
            'Paused after repeated request failures. Results and costs already received are preserved.';
        else if (abort.signal.aborted) run.note = 'Stopped. Unattempted cases can be resumed.';
        put(run.id, run);
        active = null;
      }
    })();
  });
  app.post('/api/staff/comparison/runs/:id/stop', (req, res) => {
    if (active?.id === req.params.id) active.abort.abort();
    res.json({ ok: true });
  });
  app.post('/api/staff/comparison/runs/:id/import', (req, res) => {
    const run = get<BenchmarkRun>(req.params.id),
      d = dataset();
    if (!run || !d) return res.status(404).json({ error: 'Comparison not found.' });
    if (active?.id === run.id)
      return res.status(409).json({ error: 'Finish or stop the baseline run before importing.' });
    const rows = validateImport(req.body, d.cases, run.datasetHash, run.promptHash);
    if (
      rows.some((r) => run.results.some((old) => old.side === 'adapter' && old.caseId === r.caseId))
    )
      return res.status(409).json({
        error:
          'An adapter result already exists for one of these cases. Create a new comparison to keep versions separate.',
      });
    const versions = new Set(
      [...run.results.filter((r) => r.side === 'adapter'), ...rows].map((r) => r.adapterVersion),
    );
    if (versions.size > 1)
      return res.status(409).json({ error: 'Use one adapter version per comparison.' });
    run.results.push(...rows);
    put(run.id, run);
    res.json(run);
  });
  app.get('/api/staff/comparison/export', (req, res) => {
    const d = dataset();
    if (!d) return res.status(409).json({ error: 'Seed the dataset first.' });
    const run = req.query.run ? get<BenchmarkRun>(String(req.query.run)) : undefined;
    res.setHeader('Content-Disposition', 'attachment; filename="wellby-comparison.json"');
    res.json({
      schemaVersion: 1,
      datasetHash: d.hash,
      promptHash: run?.promptHash || promptHash(),
      instructions,
      model: run?.model || model(),
      cases: d.cases,
      run: run || null,
      methodology:
        'Synthetic authored labels; raw model routes, no patient safety overrides. Failed calls count as incorrect. Cost is token-based estimate where stated; unknown is not zero. Console imports are user-supplied evidence, not independently verified.',
      adapterImportExample: {
        datasetHash: d.hash,
        promptHash: run?.promptHash || promptHash(),
        adapterVersion: 'REPLACE_WITH_VERIFIED_VERSION',
        evidenceUrl: consoleUrl,
        results: [
          {
            caseId: d.cases[0].id,
            inputHash: d.cases[0].inputHash,
            reply: 'REPLACE_WITH_ACTUAL_JSON_REPLY',
            latencyMs: null,
            inputTokens: null,
            outputTokens: null,
            costUsd: null,
            requestId: 'REPLACE_WITH_CONSOLE_RECEIPT',
          },
        ],
      },
    });
  });
}
