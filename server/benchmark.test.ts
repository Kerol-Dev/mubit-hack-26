import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unseenCases, hash } from './benchmark-data';
import { history } from './data';
import { validateImport } from './benchmark';
import {
  sideMetrics,
  pairedMetrics,
  type Measurement,
  type BenchmarkRun,
} from '../shared/benchmark';
const cases = unseenCases();
const row = (id: string, extra: Partial<Measurement> = {}): Measurement => ({
  caseId: id,
  side: 'baseline',
  status: 'success',
  route: cases.find((c) => c.id === id)!.expected,
  latencyMs: 100,
  inputTokens: 100,
  outputTokens: 100,
  costUsd: 0.01,
  costKind: 'estimate',
  model: 'test',
  at: '2026-10-24',
  provenance: 'api',
  latencyBasis: 'client-roundtrip',
  ...extra,
});
test('100 distinct held-out inputs do not duplicate teaching or earlier evaluation inputs', () => {
  assert.equal(cases.length, 100);
  assert.equal(new Set(cases.map((c) => c.inputHash)).size, 100);
  const training = new Set(history.map((c) => c.input.symptoms.toLowerCase().trim()));
  assert.ok(cases.every((c) => !training.has(c.input.symptoms.toLowerCase().trim())));
  assert.equal(new Set(cases.map((c) => c.expected)).size, 7);
});
test('accuracy counts failed calls as incorrect and reports incomplete cost coverage', () => {
  const metrics = sideMetrics(
    [row('U-001'), row('U-002', { status: 'error', route: undefined, costUsd: null })],
    cases,
    'baseline',
  );
  assert.equal(metrics.accuracy, 0.5);
  assert.equal(metrics.coverage, 0.01);
  assert.equal(metrics.costUsd, null);
  assert.equal(metrics.costKnown, 1);
  assert.equal(metrics.errors, 1);
});
test('paired comparison cannot include unpaired successes or mix timing boundaries', () => {
  const run: BenchmarkRun = {
    id: 'test',
    datasetHash: 'd',
    promptHash: 'p',
    createdAt: 'now',
    status: 'complete',
    model: 'test',
    results: [
      row('U-001'),
      row('U-002'),
      row('U-001', {
        side: 'adapter',
        route: 'gp',
        latencyBasis: 'console-reported',
        provenance: 'console-import',
        costKind: 'reported',
      }),
    ],
  };
  const result = pairedMetrics(run, cases);
  assert.equal(result.count, 1);
  assert.equal(result.baseline.accuracy, 1);
  assert.equal(result.adapter.accuracy, 0);
  assert.equal(result.sameTiming, false);
  assert.equal(result.sameCost, false);
});
test('urgent failures and emergency under-triage count as missed escalations', () => {
  const emergency = cases.find((c) => c.expected === 'emergency')!,
    urgent = cases.find((c) => c.expected === 'urgent')!;
  const m = sideMetrics(
    [row(emergency.id, { route: 'urgent' }), row(urgent.id, { status: 'error', route: undefined })],
    cases,
    'baseline',
  );
  assert.equal(m.urgentTotal, 2);
  assert.equal(m.urgentMissed, 2);
});
const payload = () => ({
  datasetHash: hash(cases),
  promptHash: 'prompt',
  adapterVersion: 'Wellby v1',
  evidenceUrl: 'https://app.mubit.ai/console/example',
  results: [
    {
      caseId: 'U-001',
      inputHash: cases[0].inputHash,
      reply: JSON.stringify({
        route: 'pharmacy',
        summary: 's',
        reason: 'r',
        nextStep: 'n',
        safetyNet: 's',
        needsReview: false,
      }),
      latencyMs: 20,
      inputTokens: 10,
      outputTokens: 20,
      costUsd: null,
      requestId: 'receipt-1',
    },
  ],
});
test('imports validate dataset, prompt, case content and duplicate IDs', () => {
  assert.throws(() =>
    validateImport({ ...payload(), datasetHash: 'different' }, cases, hash(cases), 'prompt'),
  );
  assert.throws(() =>
    validateImport({ ...payload(), promptHash: 'different' }, cases, hash(cases), 'prompt'),
  );
  const p = payload();
  p.results[0].inputHash = 'wrong';
  assert.throws(() => validateImport(p, cases, hash(cases), 'prompt'));
  const dup = payload();
  dup.results.push(dup.results[0]);
  assert.throws(() => validateImport(dup, cases, hash(cases), 'prompt'));
});
test('valid console evidence retains unknown cost and imported provenance', () => {
  const imported = validateImport(payload(), cases, hash(cases), 'prompt')[0];
  assert.equal(imported.costUsd, null);
  assert.equal(imported.costKind, 'unknown');
  assert.equal(imported.provenance, 'console-import');
  assert.equal(imported.latencyBasis, 'console-reported');
  assert.equal(imported.adapterVersion, 'Wellby v1');
});

test('failed adapter imports remain in the denominator', () => {
  const p = payload();
  const data = {
    ...p,
    results: [
      { ...p.results[0], status: 'error', reply: undefined, error: 'Timed out', latencyMs: null },
    ],
  };
  const rows = validateImport(data, cases, hash(cases), 'prompt');
  assert.equal(rows[0].status, 'error');
  assert.equal(sideMetrics(rows, cases, 'adapter').accuracy, 0);
});
