import { useEffect, useState, useRef } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  Upload,
  Play,
  Square,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  X,
  Database,
  Clock3,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  routeNames,
  sideMetrics,
  pairedMetrics,
  type BenchmarkState,
  type BenchmarkRun,
  type BenchmarkCase,
  type Measurement,
} from '../shared/benchmark';
import type { Route } from '../shared/types';
const api = async <T,>(path: string, body?: unknown): Promise<T> => {
  const r = await fetch('/api/staff/comparison' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Unable to complete this action.');
  return d;
};
const pct = (n: number | null) => (n === null ? '—' : (n * 100).toFixed(1) + '%');
const seconds = (n: number | null) => (n === null ? '—' : (n / 1000).toFixed(2) + 's');
const dollars = (n: number | null) => (n === null ? 'Not reported' : '$' + n.toFixed(4));
const date = (s: string) =>
  new Date(s).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
export function Comparison() {
  const [state, setState] = useState<BenchmarkState | null>(null),
    [selectedRun, setSelectedRun] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [count, setCount] = useState(100),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [page, setPage] = useState(0),
    [detail, setDetail] = useState<BenchmarkCase | null>(null),
    [method, setMethod] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [copied, setCopied] = useState(false),
    [present, setPresent] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.body.classList.toggle('comparison-mode', present);
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresent(false);
    };
    if (present) window.addEventListener('keydown', esc);
    return () => {
      document.body.classList.remove('comparison-mode');
      window.removeEventListener('keydown', esc);
    };
  }, [present]);
  const refresh = async () => {
    const s = await api<BenchmarkState>('');
    setState(s);
  };
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const t = setInterval(() => {
      void refresh().catch(() => {});
    }, 2500);
    return () => clearInterval(t);
  }, []);
  const action = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const run = state?.runs.find((r) => r.id === selectedRun) || state?.runs[0];
  const cases = state?.cases || [],
    results = run?.results || [];
  const base = sideMetrics(results, cases, 'baseline'),
    trained = sideMetrics(results, cases, 'adapter'),
    paired = run ? pairedMetrics(run, cases) : null;
  const running = run?.status === 'running';
  const seed = () =>
    action(async () => {
      await api('/seed', {});
      const r = await api<BenchmarkRun>('/runs', {});
      setSelectedRun(r.id);
    });
  const start = () =>
    action(async () => {
      let r = run;
      if (!r) {
        r = await api<BenchmarkRun>('/runs', {});
        setSelectedRun(r.id);
      }
      await api(`/runs/${r.id}/start`, { count });
    });
  const newRun = () =>
    action(async () => {
      const r = await api<BenchmarkRun>('/runs', {});
      setSelectedRun(r.id);
      setPage(0);
    });
  const upload = async (f: File | undefined) => {
    if (!f || !run) return;
    await action(async () => {
      if (f.size > 1500000) throw Error('Choose a JSON file smaller than 1.5 MB.');
      await api(`/runs/${run.id}/import`, JSON.parse(await f.text()));
      setImportOpen(false);
    });
    if (file.current) file.current.value = '';
  };
  const matching = cases.filter((c) => {
    const b = results.find((r) => r.side === 'baseline' && r.caseId === c.id),
      a = results.find((r) => r.side === 'adapter' && r.caseId === c.id);
    return (
      (!query ||
        [c.id, c.topic, c.input.symptoms].join(' ').toLowerCase().includes(query.toLowerCase())) &&
      (filter === 'all' ||
        (filter === 'pending' && !b && !a) ||
        (filter === 'disagreements' &&
          ((b?.status === 'success' && b.route !== c.expected) ||
            (a?.status === 'success' && a.route !== c.expected))) ||
        (filter === 'errors' && (b?.status === 'error' || a?.status === 'error')) ||
        c.expected === filter)
    );
  });
  const counts = Object.keys(routeNames).map((route) => ({
    route: route as Route,
    count: cases.filter((c) => c.expected === route).length,
  }));
  const exportLink =
    '/api/staff/comparison/export' + (run ? '?run=' + encodeURIComponent(run.id) : '');
  return (
    <div className={'comparison ' + (present ? 'comparison-present' : '')}>
      <div className="comparison-heading">
        <div>
          <p className="section-kicker">PRACTICE QUALITY / MODEL COMPARISON</p>
          <h1>Compare care navigation.</h1>
          <p>Compare the base model and a trained Mubit adapter on the same unseen requests.</p>
        </div>
        <button className="outline-action" onClick={() => setPresent(!present)}>
          {present ? 'Exit presentation' : 'Presentation view'}
          <BarChart3 size={16} />
        </button>
      </div>
      {error && (
        <div className="comparison-error" role="alert">
          <AlertCircle size={18} />
          {error}
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            <X size={17} />
          </button>
        </div>
      )}
      {!state ? (
        <div className="comparison-loading">Opening the comparison workspace…</div>
      ) : (
        <>
          <div className="comparison-controls">
            <div className="dataset-identity">
              <span className="dataset-icon">
                <Database size={21} />
              </span>
              <div>
                <strong>
                  {cases.length ? 'Care navigation · 100 cases' : 'Your evaluation dataset'}
                </strong>
                <small>
                  {cases.length
                    ? 'Independent synthetic cases · Version 1 · Seven pathways'
                    : 'A separate set of 100 fictional requests. No training calls.'}
                </small>
              </div>
            </div>
            <div className="comparison-actions">
              {!cases.length ? (
                <button className="solid-action" disabled={busy} onClick={() => void seed()}>
                  Seed 100 unseen cases
                  <ArrowRight size={17} />
                </button>
              ) : (
                <>
                  <a className="outline-action" href={exportLink} download>
                    <Download size={15} />
                    Export evidence
                  </a>
                  <button
                    className="outline-action"
                    onClick={() => void newRun()}
                    disabled={busy || state.runs.some((r) => r.status === 'running')}
                  >
                    New comparison
                  </button>
                </>
              )}
            </div>
          </div>
          {!!cases.length && (
            <>
              <div className="comparison-runbar">
                <div>
                  <span className={'run-dot ' + (running ? 'running' : '')} />
                  <strong>
                    {running
                      ? 'Baseline running'
                      : run
                        ? run.status === 'complete'
                          ? 'Baseline complete'
                          : base.attempted
                            ? 'Run paused'
                            : 'Ready to compare'
                        : 'Ready to compare'}
                  </strong>
                  <span>
                    {base.attempted} / 100 base calls · {trained.attempted} / 100 adapter results
                  </span>
                </div>
                <select
                  aria-label="Select comparison run"
                  value={run?.id || ''}
                  onChange={(e) => {
                    setSelectedRun(e.target.value);
                    setPage(0);
                  }}
                >
                  {state.runs.map((r, i) => (
                    <option key={r.id} value={r.id}>
                      Run {state.runs.length - i} · {date(r.createdAt)}
                    </option>
                  ))}
                </select>
              </div>
              {run?.note && <p className="run-note">{run.note}</p>}
              <div className="model-comparison-grid">
                <section className="model-sheet baseline">
                  <div className="model-sheet-title">
                    <span className="model-letter">A</span>
                    <div>
                      <span>BASE MODEL</span>
                      <h2>Claude Haiku 4.5</h2>
                    </div>
                    <span className="model-status">
                      {state.baseline.transport === 'direct'
                        ? 'Direct provider'
                        : 'Via Mubit gateway'}
                    </span>
                  </div>
                  <p>The original model, without a Wellby adapter. Evaluation recording is off.</p>
                  <div className="model-main-stat">
                    <strong>{pct(base.accuracy)}</strong>
                    <div>
                      Route accuracy
                      <small>
                        {base.correct} correct / {base.attempted} attempted
                      </small>
                    </div>
                  </div>
                  <div className="metric-track">
                    <i
                      style={{ width: base.attempted ? `${(base.accuracy || 0) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="model-small-stats">
                    <div>
                      <span>Average time</span>
                      <strong>{seconds(base.meanMs)}</strong>
                      <small>Request to complete response</small>
                    </div>
                    <div>
                      <span>
                        {base.attempted && base.costUsd === null
                          ? 'Known cost subtotal'
                          : 'Token cost estimate'}
                      </span>
                      <strong>
                        {base.attempted
                          ? dollars(base.costUsd ?? (base.costKnown ? base.knownCostUsd : null))
                          : '—'}
                      </strong>
                      <small>
                        {base.costUsd === null && base.attempted
                          ? `${base.costKnown}/${base.attempted} known · remaining cost unknown`
                          : 'USD · provider list pricing'}
                      </small>
                    </div>
                  </div>
                  <div className="model-secondary-stats">
                    <span>
                      P50 <b>{seconds(base.p50Ms)}</b>
                    </span>
                    <span>
                      P95 <b>{seconds(base.p95Ms)}</b>
                    </span>
                    <span>
                      Errors <b>{base.errors}</b>
                    </span>
                  </div>
                  <div className="model-sheet-action">
                    {running ? (
                      <button
                        className="outline-action"
                        onClick={() => void action(() => api(`/runs/${run!.id}/stop`, {}))}
                      >
                        <Square size={14} />
                        Stop run
                      </button>
                    ) : (
                      <>
                        <select
                          aria-label="Number of baseline cases"
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                        >
                          <option value={5}>Next 5 cases</option>
                          <option value={25}>Next 25 cases</option>
                          <option value={100}>All remaining cases</option>
                        </select>
                        <button
                          className="solid-action"
                          disabled={
                            busy ||
                            !state.baseline.available ||
                            base.attempted === 100 ||
                            state.runs.some((r) => r.status === 'running')
                          }
                          onClick={() => void start()}
                        >
                          <Play size={15} />
                          {base.attempted === 100
                            ? 'Run completed'
                            : base.attempted
                              ? 'Resume baseline'
                              : 'Run baseline'}
                        </button>
                      </>
                    )}
                  </div>
                  <small className="model-cost-note">
                    Real API usage charges apply. Displayed estimates use returned token counts.
                  </small>
                </section>
                <section className="model-sheet adapter">
                  <div className="model-sheet-title">
                    <span className="model-letter">B</span>
                    <div>
                      <span>MUBIT ADAPTER</span>
                      <h2>Trained on your task</h2>
                    </div>
                    <span className="model-status">
                      {trained.attempted ? 'Imported evidence' : 'Awaiting adapter'}
                    </span>
                  </div>
                  <p>
                    {trained.attempted
                      ? 'Console results supplied for this run. Provenance is visible on every case.'
                      : 'A second base-model call is never counted as a trained response.'}
                  </p>
                  <div className="model-main-stat">
                    <strong>{pct(trained.accuracy)}</strong>
                    <div>
                      Route accuracy
                      <small>
                        {trained.correct} correct / {trained.attempted} imported
                      </small>
                    </div>
                  </div>
                  <div className="metric-track">
                    <i
                      style={{
                        width: trained.attempted ? `${(trained.accuracy || 0) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <div className="model-small-stats">
                    <div>
                      <span>Average time</span>
                      <strong>{seconds(trained.meanMs)}</strong>
                      <small>Console-reported timing</small>
                    </div>
                    <div>
                      <span>Reported cost</span>
                      <strong>{trained.attempted ? dollars(trained.costUsd) : '—'}</strong>
                      <small>No assumed discount or savings</small>
                    </div>
                  </div>
                  <div className="model-secondary-stats">
                    <span>
                      P50 <b>{seconds(trained.p50Ms)}</b>
                    </span>
                    <span>
                      P95 <b>{seconds(trained.p95Ms)}</b>
                    </span>
                    <span>
                      Errors <b>{trained.errors}</b>
                    </span>
                  </div>
                  <div className="model-sheet-action">
                    <a
                      className="outline-action"
                      href={state.adapter.consoleUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Mubit
                      <ArrowUpRight size={15} />
                    </a>
                    <button
                      className="solid-action"
                      disabled={!run || running || busy}
                      onClick={() => setImportOpen(true)}
                    >
                      <Upload size={15} />
                      Add adapter results
                    </button>
                  </div>
                  <small className="model-cost-note">{state.adapter.reason}</small>
                </section>
              </div>
              <div className="comparison-verdict">
                <div>
                  <CheckCircle2 size={23} />
                  <div>
                    <strong>
                      {paired?.count
                        ? `${paired.count} matched cases ready to inspect`
                        : 'Waiting for matched results'}
                    </strong>
                    <p>
                      {paired?.count
                        ? 'Paired accuracy uses only cases attempted on both sides.'
                        : 'Add adapter results for the same cases to compare outcomes.'}
                    </p>
                  </div>
                </div>
                <div className="paired-stat">
                  <strong>
                    {paired?.count
                      ? ((paired.adapter.accuracy! - paired.baseline.accuracy!) * 100).toFixed(1) +
                        ' pp'
                      : '—'}
                  </strong>
                  <span>
                    Accuracy change<small>percentage points · matched cases</small>
                  </span>
                </div>
                <div className="paired-stat">
                  <strong>
                    {paired?.count &&
                    paired.sameTiming &&
                    paired.adapter.meanMs &&
                    paired.baseline.meanMs
                      ? (paired.baseline.meanMs / paired.adapter.meanMs).toFixed(2) + '×'
                      : '—'}
                  </strong>
                  <span>
                    Speed comparison
                    <small>
                      {paired?.count && !paired.sameTiming
                        ? 'Timing methods differ'
                        : 'Needs comparable timings'}
                    </small>
                  </span>
                </div>
                <div className="paired-stat">
                  <strong>
                    {paired?.count &&
                    paired.sameCost &&
                    paired.baseline.costUsd &&
                    paired.adapter.costUsd !== null
                      ? pct(1 - paired.adapter.costUsd / paired.baseline.costUsd)
                      : '—'}
                  </strong>
                  <span>
                    Cost reduction
                    <small>
                      {paired?.count && !paired.sameCost
                        ? 'Cost methods differ or missing'
                        : 'Needs comparable costs'}
                    </small>
                  </span>
                </div>
              </div>
              <section className="evaluation-coverage">
                <div>
                  <p className="section-kicker">THE TEST SET</p>
                  <h2>Every pathway represented.</h2>
                  <p>
                    100 held-out fictional requests. Accuracy is agreement with illustrative labels,
                    not clinical validation.
                  </p>
                </div>
                <div className="coverage-chart">
                  <div className="coverage-stack">
                    {counts.map((c, i) => (
                      <span
                        key={c.route}
                        style={{ width: c.count + '%', background: `var(--route-${i})` }}
                        title={`${routeNames[c.route]}: ${c.count}`}
                      />
                    ))}
                  </div>
                  <div className="coverage-legend">
                    {counts.map((c, i) => (
                      <button
                        key={c.route}
                        onClick={() => {
                          setFilter(filter === c.route ? 'all' : c.route);
                          setPage(0);
                        }}
                      >
                        <i style={{ background: `var(--route-${i})` }} />
                        {routeNames[c.route]}
                        <b>{c.count}</b>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <div className="evaluation-safety">
                <span>Escalation checks</span>
                <strong>
                  Base: {base.urgentMissed} / {base.urgentTotal} urgent cases missed
                </strong>
                <strong>
                  Adapter: {trained.urgentMissed} / {trained.urgentTotal} missed
                </strong>
                <small>
                  Includes failed responses. A high overall score can hide important errors.
                </small>
              </div>
              <section className="comparison-casebook">
                <div className="casebook-heading">
                  <h2>
                    Look behind the numbers <span>{matching.length}</span>
                  </h2>
                  <div>
                    <input
                      aria-label="Search comparison cases"
                      placeholder="Search cases or symptoms"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(0);
                      }}
                    />
                    <select
                      aria-label="Filter comparison cases"
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="all">All cases</option>
                      <option value="disagreements">Incorrect routes</option>
                      <option value="errors">Failed calls</option>
                      <option value="pending">Not attempted</option>
                      {Object.entries(routeNames).map(([r, n]) => (
                        <option value={r} key={r}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="casebook-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Request</th>
                        <th>Expected pathway</th>
                        <th>Base model</th>
                        <th>Mubit adapter</th>
                        <th>
                          <span className="sr-only">Details</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matching.slice(page * 10, (page + 1) * 10).map((c) => (
                        <tr key={c.id} onClick={() => setDetail(c)}>
                          <td>
                            <button onClick={() => setDetail(c)}>
                              <small>{c.id}</small>
                              <strong>{c.topic}</strong>
                              <span>{c.input.symptoms}</span>
                            </button>
                          </td>
                          <td>{routeNames[c.expected]}</td>
                          {(['baseline', 'adapter'] as const).map((side) => {
                            const r = results.find((r) => r.caseId === c.id && r.side === side);
                            return (
                              <td key={side}>
                                {r ? (
                                  <>
                                    <span
                                      className={
                                        'case-result ' +
                                        (r.status === 'error'
                                          ? 'failed'
                                          : r.route === c.expected
                                            ? 'correct'
                                            : 'incorrect')
                                      }
                                    >
                                      {r.status === 'error' ? 'Failed' : routeNames[r.route!]}
                                      {r.route === c.expected && <Check size={13} />}
                                    </span>
                                    <small>
                                      {seconds(r.latencyMs)}
                                      {r.provenance === 'console-import' ? ' · imported' : ''}
                                    </small>
                                  </>
                                ) : (
                                  <span className="case-pending">Not run</span>
                                )}
                              </td>
                            );
                          })}
                          <td>
                            <ChevronRight size={17} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!matching.length && (
                  <div className="comparison-empty">No cases match these filters.</div>
                )}
                <div className="casebook-footer">
                  <span>
                    {matching.length
                      ? `${page * 10 + 1}–${Math.min((page + 1) * 10, matching.length)} of ${matching.length} cases`
                      : '0 cases'}
                  </span>
                  <div>
                    <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </button>
                    <button
                      disabled={(page + 1) * 10 >= matching.length}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
          <button
            className="method-toggle"
            onClick={() => setMethod(!method)}
            aria-expanded={method}
          >
            How this comparison is measured
            <ChevronDown size={16} />
          </button>
          {method && (
            <div className="comparison-method">
              <p>
                <strong>Unseen within this project.</strong> These 100 cases are authored separately
                from the 100 teaching examples and 20 original evaluation cases. They are never sent
                for training. This does not claim the underlying foundation model has never seen
                similar symptoms.
              </p>
              <p>
                <strong>Raw outputs.</strong> Both sides receive the same instructions and patient
                input. Expected labels are withheld. Patient-facing safety overrides are
                deliberately excluded from scoring so they cannot inflate model accuracy. Errors
                count as incorrect; coverage is shown separately.
              </p>
              <p>
                <strong>Measured, not invented.</strong> Baseline times include the entire client
                round trip
                {state.baseline.transport === 'gateway' ? ' through the Mubit gateway' : ''}.
                Imported console timings have a different measurement boundary, so no speed-up ratio
                is computed across them. Costs use actual token counts at{' '}
                <a href={state.pricing.source} target="_blank" rel="noreferrer">
                  published Haiku 4.5 rates
                </a>{' '}
                ($1 input / $5 output per million tokens); this is an estimate, not your invoice.
                Unknown costs remain unknown. Estimated provider cost is not compared to reported
                adapter cost as a verified saving.
              </p>
              <p>
                <strong>Provenance.</strong> Adapter imports must match the dataset, prompt and case
                hashes and identify an adapter version and Mubit receipt. Imports remain labelled
                user-supplied; a link alone is not independent verification. All datasets are
                fictional and have not been clinically validated.
              </p>
            </div>
          )}
        </>
      )}
      <Dialog.Root open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="comparison-detail">
            <div className="comparison-dialog-top">
              <div>
                <p className="section-kicker">CASE {detail?.id}</p>
                <Dialog.Title>{detail?.topic}</Dialog.Title>
                <Dialog.Description>
                  Expected pathway: {detail && routeNames[detail.expected]}. Illustrative label.
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close case">
                <X size={22} />
              </Dialog.Close>
            </div>
            {detail && (
              <>
                <blockquote>{detail.input.symptoms}</blockquote>
                <div className="case-input-facts">
                  <span>Age {detail.input.age}</span>
                  <span>{detail.input.severity} severity</span>
                  <span>{detail.input.pregnant ? 'Pregnant' : 'Not pregnant'}</span>
                  <span>{detail.input.conditions}</span>
                </div>
                <button
                  className="outline-action"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(JSON.stringify(detail.input, null, 2))
                      .then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      })
                      .catch(() =>
                        setError('Clipboard access is unavailable. Export the dataset instead.'),
                      );
                  }}
                >
                  <Copy size={14} />
                  {copied ? 'Copied' : 'Copy input for Mubit'}
                </button>
                <div className="case-replies">
                  {(['baseline', 'adapter'] as const).map((side) => {
                    const r = results.find((r) => r.caseId === detail.id && r.side === side);
                    return (
                      <section key={side}>
                        <h3>{side === 'baseline' ? 'A · Base model' : 'B · Mubit adapter'}</h3>
                        {r ? (
                          <>
                            <p className="reply-route">
                              {r.route ? routeNames[r.route] : 'Request failed'}
                              <span>{seconds(r.latencyMs)}</span>
                            </p>
                            <pre>{r.reply || r.error}</pre>
                            <dl>
                              <div>
                                <dt>Model</dt>
                                <dd>{r.model}</dd>
                              </div>
                              <div>
                                <dt>Request</dt>
                                <dd>{r.requestId || 'Not returned'}</dd>
                              </div>
                              <div>
                                <dt>Cost</dt>
                                <dd>
                                  {dollars(r.costUsd)} · {r.costKind}
                                </dd>
                              </div>
                              <div>
                                <dt>Evidence</dt>
                                <dd>
                                  {r.provenance === 'api'
                                    ? 'Recorded from API response'
                                    : 'User-supplied console result'}
                                </dd>
                              </div>
                            </dl>
                            {r.evidenceUrl && (
                              <a href={r.evidenceUrl} target="_blank" rel="noreferrer">
                                Open source evidence
                                <ArrowUpRight size={13} />
                              </a>
                            )}
                          </>
                        ) : (
                          <p className="reply-empty">
                            No result yet. This space is reserved for the actual reply.
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={importOpen} onOpenChange={setImportOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="comparison-detail import-detail">
            <div className="comparison-dialog-top">
              <div>
                <p className="section-kicker">MUBIT / MEASURED RESULTS</p>
                <Dialog.Title>Add adapter evidence</Dialog.Title>
                <Dialog.Description>
                  Bring actual console results into this comparison.
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close import">
                <X size={22} />
              </Dialog.Close>
            </div>
            <ol className="import-steps">
              <li>
                <b>1</b>
                <div>
                  <strong>Use the matching inputs</strong>
                  <p>
                    Download the evidence pack. It includes the exact instructions, all 100 inputs,
                    hashes and an import template.
                  </p>
                  <a href={exportLink} download>
                    Download evidence pack
                    <Download size={14} />
                  </a>
                </div>
              </li>
              <li>
                <b>2</b>
                <div>
                  <strong>Compare a passing adapter in Mubit</strong>
                  <p>
                    Select the Wellby adapter and keep the prompt unchanged. Capture actual replies,
                    timings, version and receipts. Respect the console’s daily call limit.
                  </p>
                  <a href={state?.adapter.consoleUrl} target="_blank" rel="noreferrer">
                    Open Try models
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </li>
              <li>
                <b>3</b>
                <div>
                  <strong>Import the completed JSON</strong>
                  <p>
                    Use null for unavailable timings, tokens or costs. Never substitute estimates
                    for reported measurements. Each imported row is labelled as user-supplied
                    evidence.
                  </p>
                  <input
                    type="file"
                    accept="application/json,.json"
                    ref={file}
                    onChange={(e) => void upload(e.target.files?.[0])}
                    aria-label="Import adapter results"
                  />
                </div>
              </li>
            </ol>
            {error && (
              <div role="alert" className="comparison-error">
                {error}
              </div>
            )}
            <p className="import-caveat">
              This is a console-result import, not an automatic adapter API call. The current Mubit
              public API does not document selecting an adapter directly.
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
