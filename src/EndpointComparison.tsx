import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight,
  Download,
  Play,
  Square,
  X,
  ChevronRight,
  Check,
  BarChart3,
} from 'lucide-react';
import { routeNames, type BenchmarkCase } from '../shared/benchmark';
import {
  endpointMetrics,
  type EndpointState,
  type EndpointRun,
  type EndpointSide,
} from '../shared/endpoint-comparison';
import './endpoint-comparison.css';

const root = '/api/staff/endpoint-comparison';
async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(root + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Unable to complete this action.');
  return d;
}
const seconds = (n: number | null) => (n === null ? '—' : (n / 1000).toFixed(2) + 's');
const percent = (n: number | null) => (n === null ? '—' : (n * 100).toFixed(1) + '%');
const when = (s: string) =>
  new Date(s).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export function EndpointComparison() {
  const [state, setState] = useState<EndpointState | null>(null),
    [selected, setSelected] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [count, setCount] = useState(1);
  const [model, setModel] = useState(''),
    [page, setPage] = useState(0),
    [detail, setDetail] = useState<BenchmarkCase | null>(null);
  const [present, setPresent] = useState(false),
    [filter, setFilter] = useState('all');
  async function refresh() {
    setState(await api<EndpointState>(''));
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const t = setInterval(() => void refresh().catch(() => {}), 2500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('comparison-mode', present);
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresent(false);
    };
    window.addEventListener('keydown', esc);
    return () => {
      document.body.classList.remove('comparison-mode');
      window.removeEventListener('keydown', esc);
    };
  }, [present]);
  const run = state?.runs.find((r) => r.id === selected) || state?.runs[0];
  const anthropic = (run?.model || model || state?.model || 'claude-haiku-4-5').startsWith(
    'claude-',
  );
  const provider = anthropic ? 'Anthropic' : 'OpenAI';
  const names = { openai: provider + ' direct', mubit: 'Mubit auto-routing' };
  const configured = {
    openai: !!(anthropic ? state?.configured.anthropic : state?.configured.openai),
    mubit: !!state?.configured.mubit,
  };
  const cases = state?.cases || [],
    results = run?.results || [];
  const active = !!state?.activeRunId;
  const metrics = (side: EndpointSide) =>
    endpointMetrics(
      results.filter((r) => r.side === side),
      cases,
    );
  const matched = cases.filter((c) =>
    ['openai', 'mubit'].every((s) => results.some((r) => r.caseId === c.id && r.side === s)),
  );
  const pairs = (side: EndpointSide) =>
    endpointMetrics(
      results.filter((r) => r.side === side && matched.some((c) => c.id === r.caseId)),
      matched,
    );
  const left = pairs('openai'),
    right = pairs('mubit');
  const successfulPairs = matched.filter((c) =>
    ['openai', 'mubit'].every((s) =>
      results.some((r) => r.caseId === c.id && r.side === s && r.status === 'success'),
    ),
  );
  const successfulMean = (side: EndpointSide) =>
    endpointMetrics(
      results.filter((r) => r.side === side && successfulPairs.some((c) => c.id === r.caseId)),
      successfulPairs,
    ).meanMs;
  const leftTime = successfulMean('openai'),
    rightTime = successfulMean('mubit');
  const visible = cases.filter(
    (c) =>
      filter === 'all' ||
      (filter === 'errors' && results.some((r) => r.caseId === c.id && r.status === 'error')) ||
      (filter === 'incorrect' &&
        results.some((r) => r.caseId === c.id && r.status === 'success' && r.route !== c.expected)),
  );
  async function action(fn: () => Promise<unknown>) {
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
  }
  async function create() {
    const r = await api<EndpointRun>('/runs', { model: model || state!.model });
    setSelected(r.id);
    setPage(0);
    return r;
  }
  const start = (side: EndpointSide | 'both') =>
    action(async () => {
      const r = run || (await create());
      await api(`/runs/${r.id}/start`, { side, count });
    });
  return (
    <div className={'comparison endpoint-comparison ' + (present ? 'comparison-present' : '')}>
      <div className="comparison-heading">
        <div>
          <p className="section-kicker">PRACTICE QUALITY / LIVE COMPARISON</p>
          <h1>One request. Two routes.</h1>
          <p>{provider} directly, alongside the same request through Mubit.</p>
        </div>
        <button className="outline-action" onClick={() => setPresent(!present)}>
          {present ? 'Exit presentation' : 'Presentation view'}
          <BarChart3 size={16} />
        </button>
      </div>
      {error && (
        <div className="comparison-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            <X size={17} />
          </button>
        </div>
      )}
      {!state ? (
        <p role="status">Opening the comparison workspace…</p>
      ) : (
        <>
          <div className="endpoint-setup">
            <label>
              Model for new comparisons
              <input
                value={model || state.model}
                onChange={(e) => setModel(e.target.value)}
                disabled={busy || active}
                aria-describedby="model-help"
              />
            </label>
            <div>
              <strong>100 independent fictional requests</strong>
              <p id="model-help">
                The model is fixed when a comparison is created. Existing runs keep their original
                settings.
              </p>
            </div>
            <button
              className="outline-action"
              disabled={busy || active}
              onClick={() => void action(create)}
            >
              New comparison
              <ArrowRight size={16} />
            </button>
          </div>
          {!configured.openai && (
            <div className="endpoint-connection" role="status">
              <strong>Connect {provider} for the direct side</strong>
              <p>
                Add <code>{anthropic ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}</code> to the
                server’s <code>.env</code> file. Your Mubit key is separate; credentials never
                appear in this page.
              </p>
            </div>
          )}
          <div className="comparison-runbar">
            <div>
              <span className={'run-dot ' + (active ? 'running' : '')} />
              <strong>
                {active
                  ? 'Comparison running'
                  : run?.status === 'complete'
                    ? 'Comparison complete'
                    : results.length
                      ? 'Results saved'
                      : 'Ready to test'}
              </strong>
              <span>
                {run?.model || model || state.model} · {matched.length}/100 matched cases
              </span>
            </div>
            {state.runs.length > 0 && (
              <select
                aria-label="Select comparison run"
                value={run?.id || ''}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setPage(0);
                }}
              >
                {state.runs.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    Run {state.runs.length - i} · {r.model} · {when(r.createdAt)}
                  </option>
                ))}
              </select>
            )}
          </div>
          {run?.note && <p className="run-note">{run.note}</p>}
          <div className="endpoint-run-controls">
            <label>
              Cases per endpoint
              <select
                value={count}
                aria-label="Cases per endpoint"
                disabled={busy || active}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                <option value={1}>1 case</option>
                <option value={5}>5 cases</option>
                <option value={25}>25 cases</option>
                <option value={100}>All remaining cases</option>
              </select>
            </label>
            {active ? (
              <button
                className="outline-action"
                disabled={busy}
                onClick={() => void action(() => api(`/runs/${state.activeRunId}/stop`, {}))}
              >
                <Square size={15} />
                Stop comparison
              </button>
            ) : (
              <button
                className="solid-action"
                disabled={
                  busy || !configured.openai || !configured.mubit || run?.status === 'complete'
                }
                onClick={() => void start('both')}
              >
                <Play size={16} />
                Run both endpoints
              </button>
            )}
            <p>
              {count === 1
                ? 'One case makes up to two billable calls.'
                : `Up to ${count * 2} billable calls when running both.`}{' '}
              No automatic retries. Evaluation content is excluded from Mubit training.
            </p>
          </div>
          <div className="model-comparison-grid">
            {(['openai', 'mubit'] as const).map((side) => {
              const m = metrics(side),
                isMubit = side === 'mubit';
              return (
                <section key={side} className={'model-sheet ' + (isMubit ? 'adapter' : 'baseline')}>
                  <div className="model-sheet-title">
                    <span className="model-letter">{isMubit ? 'B' : 'A'}</span>
                    <div>
                      <span>{isMubit ? 'MUBIT GATEWAY' : 'DIRECT PROVIDER'}</span>
                      <h2>{names[side]}</h2>
                    </div>
                    <span className="model-status">
                      {configured[side] ? 'Key configured' : 'Key needed'}
                    </span>
                  </div>
                  <p>
                    {isMubit
                      ? 'Mubit chooses which model answers. A gateway response alone does not prove adapter use.'
                      : `Calls ${provider} directly using your own API key.`}
                  </p>
                  <code className="endpoint-address">
                    {anthropic
                      ? isMubit
                        ? 'api.mubit.ai/anthropic/v1'
                        : 'api.anthropic.com/v1'
                      : isMubit
                        ? 'api.mubit.ai/openai/v1'
                        : 'api.openai.com/v1'}
                  </code>
                  <div className="model-main-stat">
                    <strong>{percent(m.accuracy)}</strong>
                    <div>
                      Route accuracy
                      <small>
                        {m.correct} correct / {m.attempted} attempted
                      </small>
                    </div>
                  </div>
                  <div className="metric-track">
                    <i style={{ width: `${(m.accuracy || 0) * 100}%` }} />
                  </div>
                  <div className="model-small-stats">
                    <div>
                      <span>Average response</span>
                      <strong>{seconds(m.meanMs)}</strong>
                      <small>Same server · full round trip</small>
                    </div>
                    <div>
                      <span>Actual cost</span>
                      <strong className="endpoint-unknown">Not reported</strong>
                      <small>No assumed pricing or savings</small>
                    </div>
                  </div>
                  <div className="model-secondary-stats">
                    <span>
                      P95 <b>{seconds(m.p95Ms)}</b>
                    </span>
                    <span>
                      Tokens <b>{m.tokens === null ? '—' : m.tokens.toLocaleString()}</b>
                    </span>
                    <span>
                      Errors <b>{m.errors}</b>
                    </span>
                  </div>
                  <div className="model-sheet-action">
                    <button
                      className="solid-action"
                      disabled={busy || active || !configured[side] || m.attempted === 100}
                      onClick={() => void start(side)}
                    >
                      <Play size={15} />
                      {isMubit ? 'Run through Mubit' : `Run ${provider} directly`}
                    </button>
                  </div>
                  <small className="model-cost-note">
                    {isMubit
                      ? 'Receipts include the returned model and routing headers. Missing serving evidence stays unverified.'
                      : 'Both sides use identical request bodies. The requested model is ' +
                        (run?.model || model || state.model) +
                        '.'}
                  </small>
                </section>
              );
            })}
          </div>
          <div className="comparison-verdict">
            <div>
              <Check size={22} />
              <div>
                <strong>
                  {matched.length ? `${matched.length} matched cases` : 'Ready for the first pair'}
                </strong>
                <p>Endpoint comparison. This is not automatically a trained-adapter benchmark.</p>
              </div>
            </div>
            <div className="paired-stat">
              <strong>
                {matched.length
                  ? ((right.accuracy! - left.accuracy!) * 100).toFixed(1) + ' pp'
                  : '—'}
              </strong>
              <span>
                Accuracy difference<small>Mubit minus direct {provider}</small>
              </span>
            </div>
            <div className="paired-stat">
              <strong>
                {leftTime !== null && rightTime !== null && rightTime > 0
                  ? (leftTime / rightTime).toFixed(2) + '×'
                  : '—'}
              </strong>
              <span>
                Response speed ratio
                <small>{successfulPairs.length} successful pairs · direct / Mubit</small>
              </span>
            </div>
            <div className="paired-stat">
              <strong>—</strong>
              <span>
                Cost difference<small>Billing data not returned</small>
              </span>
            </div>
          </div>
          <section className="comparison-casebook">
            <div className="casebook-heading">
              <h2>
                Requests & receipts <span>{visible.length}</span>
              </h2>
              <div>
                <select
                  aria-label="Filter results"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">All cases</option>
                  <option value="incorrect">Incorrect routes</option>
                  <option value="errors">Failed calls</option>
                </select>
                {run && (
                  <a className="outline-action" href={`${root}/runs/${run.id}/export`} download>
                    <Download size={15} />
                    Export results
                  </a>
                )}
              </div>
            </div>
            <div className="casebook-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Expected</th>
                    <th>{provider} direct</th>
                    <th>Mubit auto-routing</th>
                    <th>
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.slice(page * 10, page * 10 + 10).map((c) => (
                    <tr key={c.id}>
                      <td>
                        <button onClick={() => setDetail(c)}>
                          <small>{c.id}</small>
                          <strong>{c.topic}</strong>
                          <span>{c.input.symptoms}</span>
                        </button>
                      </td>
                      <td>{routeNames[c.expected]}</td>
                      {(['openai', 'mubit'] as const).map((side) => {
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
                                </span>
                                <small>
                                  {seconds(r.latencyMs)} · {r.modelReturned || 'Model not reported'}
                                </small>
                                {side === 'mubit' && <small>Serving attribution unverified</small>}
                              </>
                            ) : (
                              <span className="case-pending">Not run</span>
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <button aria-label={`Inspect ${c.id}`} onClick={() => setDetail(c)}>
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && <p className="comparison-empty">No cases match this filter.</p>}
            <div className="casebook-footer">
              <span>
                {visible.length
                  ? `${page * 10 + 1}–${Math.min(page * 10 + 10, visible.length)} of ${visible.length}`
                  : '0 cases'}
              </span>
              <div>
                <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button
                  disabled={page * 10 + 10 >= visible.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
          <details className="endpoint-method">
            <summary>How routing and measurements work</summary>
            <p>
              Left: a direct {provider} API call. Right: Mubit's {provider}-compatible API with the
              same model, system instructions and input. Mubit chooses the serving model
              automatically. We do not force an adapter or infer one from a fast response or the
              requested model name.
            </p>
            <p>
              Mubit recording is set to metadata: it retains the request receipt and task
              fingerprint, but not the input or answer content. These evaluation cases cannot become
              training examples. Turning recording off entirely also removes the recorded task
              fingerprint; it is not a documented provider-only switch.
            </p>
            <p>
              {anthropic
                ? 'This comparison requests Claude through the same Anthropic-compatible interface used to train the Wellby Haiku task. Mubit still decides whether an eligible adapter or the provider serves it.'
                : 'This historical OpenAI comparison belongs to a different task from the Haiku adapter.'}
            </p>
            <p>
              Accuracy is agreement with illustrative fictional labels; failed calls count as
              incorrect. Timing uses the same server measurement on both endpoints. The speed ratio
              includes only matched cases with two successful responses. API responses do not report
              invoiced cost, so tokens are shown and costs remain unknown.
            </p>
          </details>
          {state.historical.length > 0 && (
            <details className="endpoint-method">
              <summary>Previous Haiku results · preserved</summary>
              <p>
                Earlier gateway results are kept separately. They are not mixed with this
                direct-provider comparison and are not proof of a direct-provider baseline.
              </p>
              {state.historical.map((r) => (
                <p key={r.id}>
                  {when(r.createdAt)} · {r.attempted} measurements{' '}
                  <a href={'/api/staff/comparison/export?run=' + encodeURIComponent(r.id)} download>
                    Download original evidence
                  </a>
                </p>
              ))}
            </details>
          )}
        </>
      )}
      <Dialog.Root open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="comparison-detail">
            <div className="comparison-dialog-top">
              <div>
                <p className="section-kicker">{detail?.id} / REQUEST RECEIPTS</p>
                <Dialog.Title>{detail?.topic}</Dialog.Title>
                <Dialog.Description>
                  Expected pathway: {detail && routeNames[detail.expected]}. Fictional test case.
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close receipts">
                <X size={22} />
              </Dialog.Close>
            </div>
            {detail && (
              <>
                <blockquote>{detail.input.symptoms}</blockquote>
                <details className="endpoint-method">
                  <summary>Exact input sent to both endpoints</summary>
                  <pre>{JSON.stringify(detail.input, null, 2)}</pre>
                </details>
                <div className="case-replies">
                  {(['openai', 'mubit'] as const).map((side) => {
                    const r = results.find((r) => r.caseId === detail.id && r.side === side);
                    return (
                      <section key={side}>
                        <h3>{names[side]}</h3>
                        {r ? (
                          <>
                            <p className="reply-route">
                              {r.status === 'success' ? routeNames[r.route!] : 'Request failed'}
                              <span>{seconds(r.latencyMs)}</span>
                            </p>
                            {r.error && <p role="alert">{r.error}</p>}
                            <pre>{r.reply || 'No response body.'}</pre>
                            <dl>
                              <div>
                                <dt>Model requested</dt>
                                <dd>{r.modelRequested}</dd>
                              </div>
                              <div>
                                <dt>Model returned</dt>
                                <dd>{r.modelReturned || 'Not reported'}</dd>
                              </div>
                              <div>
                                <dt>Serving</dt>
                                <dd>
                                  {side === 'openai'
                                    ? `Direct ${provider} endpoint`
                                    : 'Automatic routing · adapter use unverified'}
                                </dd>
                              </div>
                              <div>
                                <dt>Request receipt</dt>
                                <dd>{r.requestId || 'Not returned'}</dd>
                              </div>
                              <div>
                                <dt>HTTP status</dt>
                                <dd>{r.httpStatus ?? 'No response'}</dd>
                              </div>
                              <div>
                                <dt>Input / output tokens</dt>
                                <dd>
                                  {r.inputTokens ?? 'Unknown'} / {r.outputTokens ?? 'Unknown'}
                                </dd>
                              </div>
                              <div>
                                <dt>Cost</dt>
                                <dd>Not reported</dd>
                              </div>
                            </dl>
                            {Object.keys(r.evidence).length > 0 && (
                              <details>
                                <summary>Routing response headers</summary>
                                <pre>{JSON.stringify(r.evidence, null, 2)}</pre>
                              </details>
                            )}
                          </>
                        ) : (
                          <p className="reply-empty">
                            Run this endpoint to see its actual response.
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
    </div>
  );
}
