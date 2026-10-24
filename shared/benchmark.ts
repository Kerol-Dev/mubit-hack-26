import type { Intake, Route } from './types';
export const routeNames: Record<Route, string> = {
  pharmacy: 'Pharmacy',
  gp: 'GP',
  nurse: 'Nursing',
  physio: 'Physiotherapy',
  urgent: 'Urgent care',
  emergency: 'Emergency',
  review: 'Team review',
};
export type BenchmarkCase = {
  id: string;
  topic: string;
  input: Intake;
  expected: Route;
  inputHash: string;
};
export type Measurement = {
  caseId: string;
  side: 'baseline' | 'adapter';
  status: 'success' | 'error';
  route?: Route;
  reply?: string;
  error?: string;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  costKind: 'estimate' | 'reported' | 'unknown';
  model: string;
  requestId?: string;
  at: string;
  provenance: 'api' | 'console-import';
  latencyBasis: 'client-roundtrip' | 'console-reported';
  evidenceUrl?: string;
  adapterVersion?: string;
};
export type BenchmarkRun = {
  id: string;
  datasetHash: string;
  promptHash: string;
  model: string;
  createdAt: string;
  finishedAt?: string;
  status: 'ready' | 'running' | 'paused' | 'complete';
  results: Measurement[];
  note?: string;
};
export type SideMetrics = {
  attempted: number;
  completed: number;
  correct: number;
  accuracy: number | null;
  coverage: number;
  meanMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  costUsd: number | null;
  knownCostUsd: number;
  costKnown: number;
  errors: number;
  urgentTotal: number;
  urgentMissed: number;
};
export type BenchmarkState = {
  cases: BenchmarkCase[];
  datasetHash: string | null;
  promptHash: string;
  instructions: string;
  runs: BenchmarkRun[];
  baseline: { available: boolean; transport: 'direct' | 'gateway'; model: string };
  adapter: { available: false; reason: string; consoleUrl: string };
  pricing: { input: number; output: number; currency: string; source: string };
};
export function sideMetrics(
  rows: Measurement[],
  cases: BenchmarkCase[],
  side: 'baseline' | 'adapter',
): SideMetrics {
  const r = rows.filter((r) => r.side === side),
    ok = r.filter((r) => r.status === 'success'),
    byId = new Map(cases.map((c) => [c.id, c]));
  const correct = ok.filter((r) => r.route === byId.get(r.caseId)?.expected).length;
  const latency = ok
    .map((r) => r.latencyMs)
    .filter((v): v is number => v !== null && Number.isFinite(v))
    .sort((a, b) => a - b);
  const money = r.filter((r) => r.costUsd !== null),
    urgent = cases.filter(
      (c) => ['urgent', 'emergency'].includes(c.expected) && r.some((r) => r.caseId === c.id),
    );
  return {
    attempted: r.length,
    completed: ok.length,
    correct,
    accuracy: r.length ? correct / r.length : null,
    coverage: cases.length ? ok.length / cases.length : 0,
    meanMs: latency.length ? latency.reduce((a, b) => a + b, 0) / latency.length : null,
    p50Ms: latency.length ? latency[Math.ceil(latency.length * 0.5) - 1] : null,
    p95Ms: latency.length ? latency[Math.ceil(latency.length * 0.95) - 1] : null,
    costUsd:
      money.length === r.length && r.length ? money.reduce((s, r) => s + r.costUsd!, 0) : null,
    knownCostUsd: money.reduce((s, r) => s + r.costUsd!, 0),
    costKnown: money.length,
    errors: r.length - ok.length,
    urgentTotal: urgent.length,
    urgentMissed: urgent.filter(
      (c) =>
        !ok.some(
          (r) =>
            r.caseId === c.id &&
            (c.expected === 'emergency'
              ? r.route === 'emergency'
              : ['urgent', 'emergency'].includes(r.route!)),
        ),
    ).length,
  };
}
export function pairedMetrics(run: BenchmarkRun, cases: BenchmarkCase[]) {
  const ids = new Set(
    cases
      .filter((c) =>
        ['baseline', 'adapter'].every((s) =>
          run.results.some((r) => r.caseId === c.id && r.side === s),
        ),
      )
      .map((c) => c.id),
  );
  const paired = cases.filter((c) => ids.has(c.id)),
    rows = run.results.filter((r) => ids.has(r.caseId)),
    baseline = sideMetrics(rows, paired, 'baseline'),
    adapter = sideMetrics(rows, paired, 'adapter');
  // Console and client timing include different overhead. Do not report their ratio as a speed-up.
  const sameTiming =
    rows.length > 0 &&
    new Set(rows.filter((r) => r.status === 'success').map((r) => r.latencyBasis)).size === 1;
  const sameCost =
    rows.length > 0 &&
    rows.every((r) => r.costUsd !== null) &&
    new Set(rows.map((r) => r.costKind)).size === 1;
  return { count: paired.length, baseline, adapter, sameTiming, sameCost };
}
