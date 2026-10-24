import type { BenchmarkCase } from './benchmark';
import type { Route } from './types';

export type EndpointSide = 'openai' | 'mubit';
export type EndpointResult = {
  caseId: string;
  side: EndpointSide;
  status: 'success' | 'error';
  at: string;
  latencyMs: number;
  modelRequested: string;
  modelReturned: string | null;
  requestId: string | null;
  responseId: string | null;
  httpStatus: number | null;
  reply: string;
  route?: Route;
  error?: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  costBasis: 'unknown';
  serving: 'direct-openai' | 'direct-anthropic' | 'unverified-auto-routing';
  evidence: Record<string, string>;
};
export type EndpointRun = {
  id: string;
  model: string;
  instructions: string;
  datasetHash: string;
  promptHash: string;
  createdAt: string;
  status: 'ready' | 'running' | 'paused' | 'complete';
  results: EndpointResult[];
  note?: string;
};
export type EndpointState = {
  cases: BenchmarkCase[];
  runs: EndpointRun[];
  model: string;
  configured: Record<EndpointSide, boolean> & { anthropic: boolean };
  activeRunId: string | null;
  historical: { id: string; createdAt: string; attempted: number }[];
};
export function endpointMetrics(rows: EndpointResult[], cases: BenchmarkCase[]) {
  const expected = new Map(cases.map((c) => [c.id, c.expected]));
  const ok = rows.filter((r) => r.status === 'success');
  const times = ok.map((r) => r.latencyMs).sort((a, b) => a - b);
  const correct = ok.filter((r) => r.route === expected.get(r.caseId)).length;
  const tokensKnown =
    rows.length > 0 && rows.every((r) => r.inputTokens !== null && r.outputTokens !== null);
  return {
    attempted: rows.length,
    correct,
    errors: rows.length - ok.length,
    accuracy: rows.length ? correct / rows.length : null,
    meanMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    p95Ms: times.length ? times[Math.ceil(times.length * 0.95) - 1] : null,
    tokens: tokensKnown ? rows.reduce((s, r) => s + r.inputTokens! + r.outputTokens!, 0) : null,
  };
}
