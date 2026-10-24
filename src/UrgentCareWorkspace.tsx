import { useEffect, useState } from 'react';
import { ArrowDownToLine, Play, Square, Clock3, Database, CheckCircle2 } from 'lucide-react';
import './urgent-workspace.css';
const api = async (path = '', body?: unknown) => {
  const r = await fetch(
    '/api/staff/urgent-care' + path,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Unable to load urgent-care records.');
  return d;
};
export function UrgentCareWorkspace() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [count, setCount] = useState(10),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState('original');
  const load = () =>
    api()
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const running = !!data?.active || !!data?.training.running;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => void load(), 2500);
    return () => clearInterval(id);
  }, [running]);
  const run = async (kind: string) => {
    setBusy(true);
    setError('');
    try {
      const r = await api('/' + kind, { count });
      if (r.id) setSelected(r.id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data)
    return <div className="urgent-workspace">{error || 'Loading urgent-care evidence…'}</div>;
  const report =
    selected === 'original'
      ? data.evaluation
      : data.runs.find((x: any) => x.id === selected)?.summary;
  const rows =
    selected === 'original'
      ? data.evaluation.rows
      : data.runs.find((x: any) => x.id === selected)?.rows || [];
  return (
    <div className="urgent-workspace">
      <header className="uw-heading">
        <div>
          <span className="eyebrow">URGENT CARE · MUBIT</span>
          <h2>Waiting-time learning</h2>
          <p>A separate task from care navigation, with its own history, training and tests.</p>
        </div>
        <a className="uw-export" href="/api/staff/urgent-care/export">
          <ArrowDownToLine size={17} /> Export evidence
        </a>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="uw-stats">
        <section>
          <Database />
          <strong>{data.dataset.history.toLocaleString()}</strong>
          <span>Historical encounters</span>
          <small>Synthetic history · fixed dataset</small>
        </section>
        <section>
          <CheckCircle2 />
          <strong>
            {data.training.successful}
            <small> / 500</small>
          </strong>
          <span>Training calls recorded</span>
          <small>{data.training.errors} errors · accepted examples tracked separately</small>
        </section>
        <section>
          <Clock3 />
          <strong>
            {data.evaluation.attempted}
            <small> / 100</small>
          </strong>
          <span>Held-out cases tested</span>
          <small>Excluded from model training</small>
        </section>
      </div>
      <div className="uw-layout">
        <section className="uw-panel">
          <div className="uw-panel-title">
            <h3>Test the waiting-time task</h3>
            <span>Claude Haiku 4.5 via Mubit</span>
          </div>
          <p>
            Run the saved evaluation cases through Mubit. Each run keeps its own receipts and
            results.
          </p>
          <div className="uw-controls">
            <label>
              Cases
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={running}
              >
                {[1, 10, 25, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'case' : 'cases'}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy || running || !data.configured} onClick={() => void run('test')}>
              <Play size={17} /> Run test
            </button>
            {running && (
              <button className="uw-secondary" onClick={() => void run('stop')}>
                <Square size={15} /> Stop
              </button>
            )}
          </div>
          <small className="uw-note">
            Real API usage. One call per case, no automatic retries. Evaluation recording is off.
          </small>
          {data.active && (
            <div className="uw-progress">
              <progress value={data.active.attempted} max={data.active.target} />
              <span>
                {data.active.attempted} / {data.active.target} complete
              </span>
            </div>
          )}
          <div className="uw-report-select">
            <label htmlFor="urgent-run">Results</label>
            <select id="urgent-run" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="original">
                Original evaluation · {data.evaluation.attempted} cases
              </option>
              {data.runs.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.createdAt).toLocaleString('en-GB')} · {r.rows.length}/{r.target} ·{' '}
                  {r.status}
                </option>
              ))}
            </select>
          </div>
          <div className="uw-results">
            <div>
              <strong>
                {report?.meanAbsoluteErrorMinutes ?? '—'}
                <small> min</small>
              </strong>
              <span>Mean absolute error</span>
            </div>
            <div>
              <strong>
                {report?.intervalCoverage != null
                  ? (report.intervalCoverage * 100).toFixed(1) + '%'
                  : '—'}
              </strong>
              <span>Actual wait inside range</span>
            </div>
            <div>
              <strong>{report?.forecastsScored ?? 0}</strong>
              <span>Forecasts scored</span>
            </div>
            <div>
              <strong>{report?.safetyDiversions ?? 0}</strong>
              <span>Review / emergency responses</span>
            </div>
          </div>
          <p className="uw-note">
            Wait prediction is measured in minutes, not route accuracy. {report?.adapterServed ?? 0}{' '}
            responses have verified adapter-serving evidence.
          </p>
        </section>
        <aside className="uw-panel">
          <h3>Training progress</h3>
          <p>
            {data.training.successful} successful calls submitted. A recorded call is not yet an
            accepted training example.
          </p>
          <button
            disabled={busy || running || !data.training.remaining || !data.configured}
            onClick={() => void run('train')}
          >
            <Play size={16} />
            {data.training.remaining ? 'Send training examples' : 'All 500 examples attempted'}
          </button>
          <div className="uw-console">
            <span>LAST CONSOLE CHECK</span>
            <strong>{data.console.status}</strong>
            <p>
              {data.console.kept} examples kept · {data.console.calls} calls
            </p>
            <small>
              {new Date(data.console.observedAt).toLocaleString('en-GB')} · Saved observation
            </small>
            <p>
              {data.console.sentForReview} sent for review; {data.console.overLimit} exceeded the
              observed daily review limit.
            </p>
          </div>
          <details>
            <summary>Coverage &amp; evidence</summary>
            <p>
              {data.dataset.directorySites} sourced locations across the UK. Waiting-time history
              currently covers {data.dataset.forecastSites} West London centres. Other locations do
              not receive invented forecasts.
            </p>
            <p>
              Current gateway responses preserve request IDs. Adapter use stays unverified without
              serving evidence.
            </p>
          </details>
        </aside>
      </div>
      <section className="uw-panel">
        <h3>Response receipts</h3>
        <div className="uw-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Case</th>
                <th>Result</th>
                <th>Error</th>
                <th>Response</th>
                <th>Mubit receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice(-20)
                .reverse()
                .map((r: any) => (
                  <tr key={r.caseId}>
                    <td>{r.caseId}</td>
                    <td>{r.success ? r.answer?.status : 'Failed'}</td>
                    <td>{r.absoluteError != null ? r.absoluteError + ' min' : '—'}</td>
                    <td>
                      {r.receipt?.durationMs ? (r.receipt.durationMs / 1000).toFixed(2) + 's' : '—'}
                    </td>
                    <td>
                      <code>{r.receipt?.requestId || r.error || '—'}</code>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <small className="uw-note">
          Most recent 20 results in this run. Original training and evaluation records are
          preserved.
        </small>
      </section>
    </div>
  );
}
