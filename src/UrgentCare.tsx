import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  MapPin,
  ShieldCheck,
  LoaderCircle,
  Plus,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { urgentConditions, type UrgentInput, type UrgentResult } from '../shared/urgent-care';
import './urgent-care.css';
export const urgentDemoConcern =
  'I twisted my ankle stepping off a kerb this morning. It is swollen and painful to walk on, but I can put some weight on it. There is no open wound or numbness.';
export function UrgentCare({ onBack }: { onBack: () => void }) {
  const [symptoms, setSymptoms] = useState(''),
    [postcode, setPostcode] = useState(''),
    [condition, setCondition] = useState<UrgentInput['condition']>('Injury or sprain'),
    [screen, setScreen] = useState<'none' | 'emergency' | ''>(''),
    [adult, setAdult] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<UrgentResult | null>(null),
    [selected, setSelected] = useState('');
  const reset = () => {
    setResult(null);
    setError('');
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const r = await fetch('/api/urgent-care/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          postcode,
          condition,
          emergency: screen === 'emergency',
          adult,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Please try again.');
      setResult(data);
      setSelected(data.results?.[0]?.site.id || '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const chosen = result?.results.find((x) => x.site.id === selected) || result?.results[0];
  return (
    <div className="urgent-page">
      <button className="urgent-back" onClick={onBack}>
        <ArrowLeft size={16} /> Back to overview
      </button>
      <header className="urgent-heading">
        <div>
          <span className="urgent-eyebrow">
            CARE WITHOUT THE GUESSWORK <b>Demo</b>
          </span>
          <h1>Urgent care, near you.</h1>
          <p>Find a nearby NHS centre. Know what to expect.</p>
        </div>
        <span className="urgent-heading-icon">
          <Clock3 size={32} />
        </span>
      </header>
      <div className="urgent-layout">
        <section className="urgent-input-card">
          <div className="urgent-card-heading">
            <span>01</span>
            <h2>What brings you here?</h2>
          </div>
          <form onSubmit={submit}>
            <fieldset disabled={busy} className="urgent-form-fields">
              <label htmlFor="urgent-symptoms">
                Your concern <small>No diagnosis needed</small>
              </label>
              <textarea
                id="urgent-symptoms"
                value={symptoms}
                onChange={(e) => {
                  setSymptoms(e.target.value);
                  reset();
                }}
                placeholder="Tell us what happened and how you feel…"
                minLength={15}
                maxLength={1500}
                required
                rows={4}
              />
              <button
                type="button"
                className="urgent-example"
                onClick={() => {
                  setSymptoms(urgentDemoConcern);
                  setPostcode('W10 6DZ');
                  setCondition('Injury or sprain');
                  setScreen('none');
                  setAdult(true);
                  reset();
                }}
              >
                Try an ankle injury example <ArrowUpRight size={14} />
              </button>
              <div className="urgent-fields">
                <label>
                  Closest description
                  <select
                    value={condition}
                    onChange={(e) => {
                      setCondition(e.target.value as UrgentInput['condition']);
                      reset();
                    }}
                  >
                    {urgentConditions.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Your postcode
                  <input
                    value={postcode}
                    onChange={(e) => {
                      setPostcode(e.target.value);
                      reset();
                    }}
                    placeholder="e.g. W10 6DZ"
                    maxLength={10}
                    required
                    autoComplete="postal-code"
                  />
                </label>
              </div>
              <fieldset className="urgent-safety">
                <legend>Before we continue</legend>
                <p>
                  Chest pain, severe breathing difficulty, stroke signs or uncontrolled bleeding?
                </p>
                <div>
                  <label>
                    <input
                      type="radio"
                      name="urgent-safety"
                      checked={screen === 'none'}
                      onChange={() => {
                        setScreen('none');
                        reset();
                      }}
                      required
                    />{' '}
                    None of these
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="urgent-safety"
                      checked={screen === 'emergency'}
                      onChange={() => {
                        setScreen('emergency');
                        reset();
                      }}
                    />{' '}
                    Yes / not sure
                  </label>
                </div>
              </fieldset>
              {screen === 'emergency' ? (
                <div className="urgent-alert" role="alert">
                  <AlertCircle size={20} />
                  <div>
                    <strong>Call 999 now</strong>
                    <p>Do not wait for a waiting-time result.</p>
                  </div>
                  <a href="tel:999">Call 999</a>
                </div>
              ) : (
                <>
                  <label className="urgent-adult">
                    <input
                      type="checkbox"
                      checked={adult}
                      onChange={(e) => {
                        setAdult(e.target.checked);
                        reset();
                      }}
                    />{' '}
                    This request is for someone aged 18 or over
                  </label>
                  <button className="urgent-primary" disabled={busy || !screen} type="submit">
                    {busy ? (
                      <>
                        <LoaderCircle className="spin" size={20} /> Checking nearby centres…
                      </>
                    ) : (
                      <>
                        Find care & waiting times <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </>
              )}
              {error && (
                <p className="urgent-error" role="alert">
                  {error}
                </p>
              )}
            </fieldset>
          </form>
          <details className="urgent-method">
            <summary>
              How this works <ChevronDown size={15} />
            </summary>
            <p>
              UK postcode search uses a sourced directory of emergency and urgent-care services,
              ordered by straight-line distance. Opening hours and service availability need
              checking with the centre. Forecasts are currently supported for three West London
              centres; other locations show no invented wait. Waits are model estimates from
              synthetic historical encounters, not live NHS queue data or medical advice. Time means
              arrival to first treating clinician, not total visit time. Clinical priority can
              change the wait. Postcodes are looked up through postcodes.io; only concern and coarse
              arrival context go to Mubit. Model responses are not added to training.
            </p>
            <a
              href="https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-visit-an-urgent-treatment-centre/"
              target="_blank"
              rel="noreferrer"
            >
              About NHS urgent care <ArrowUpRight size={13} />
            </a>
            <p>
              Directory: Postcodes UK / OpenStreetMap / ONS, with Northern Ireland HSC listings.
              Snapshot 24 October 2026; not an exhaustive NHS directory.
            </p>
            <a
              href="https://www.postcodesuk.com/data-downloads/hospitals"
              target="_blank"
              rel="noreferrer"
            >
              Directory source &amp; attribution <ArrowUpRight size={13} />
            </a>
            {result?.receipt && (
              <p className="urgent-receipt">
                Mubit request {result.receipt.requestId}
                <br />
                Response: {(result.receipt.durationMs / 1000).toFixed(2)}s ·{' '}
                {result.receipt.serving === 'provider'
                  ? 'Provider model via Mubit'
                  : result.receipt.serving === 'adapter'
                    ? 'Verified adapter'
                    : 'Serving model unverified'}
              </p>
            )}
          </details>
        </section>
        <section className="urgent-results" aria-live="polite" aria-busy={busy}>
          {busy ? (
            <div className="urgent-empty">
              <div className="urgent-orbit">
                <LoaderCircle size={34} className="spin" />
              </div>
              <h2>Finding your next step.</h2>
              <p>Looking at location, arrival time and similar visits.</p>
            </div>
          ) : chosen && (result?.status === 'estimate' || result?.status === 'directory') ? (
            <>
              <div className="urgent-result-label">
                <span>
                  <MapPin size={15} /> Nearby services
                </span>
                <small>
                  {new Date(result.createdAt).toLocaleTimeString('en-GB', {
                    timeZone: 'Europe/London',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </div>
              <div className="urgent-centre-list">
                {result.results.map((x, i) => (
                  <button
                    key={x.site.id}
                    onClick={() => setSelected(x.site.id)}
                    className={x.site.id === chosen.site.id ? 'selected' : ''}
                  >
                    <span className="urgent-number">{i + 1}</span>
                    <span>
                      <strong>{x.site.name}</strong>
                      <small>{x.distanceMiles.toFixed(1)} miles away</small>
                    </span>
                    <span className="urgent-small-wait">
                      {x.lowMinutes !== null ? (
                        <>
                          {x.lowMinutes}–{x.highMinutes}
                          <small>min</small>
                        </>
                      ) : (
                        <small>
                          Wait not
                          <br />
                          published
                        </small>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              {chosen.lowMinutes !== null ? (
                <div className="urgent-time-card">
                  <span>
                    <Clock3 size={17} /> Expected wait
                  </span>
                  <div>
                    <strong>
                      {chosen.lowMinutes}–{chosen.highMinutes}
                    </strong>
                    <span>min</span>
                  </div>
                  <p>At {chosen.site.name}</p>
                  <footer>
                    <span>{chosen.site.hours}</span>
                    <ShieldCheck size={18} />
                  </footer>
                </div>
              ) : (
                <div className="urgent-directory-card">
                  <span>
                    <MapPin size={18} />{' '}
                    {chosen.site.kind === 'urgent' ? 'Urgent care service' : 'Emergency department'}
                  </span>
                  <h2>{chosen.site.name}</h2>
                  <p>
                    {chosen.site.address}
                    <br />
                    {chosen.site.postcode}
                  </p>
                  <strong>Wait not published</strong>
                  <small>Check opening hours and access with the centre.</small>
                  <a
                    href={
                      'https://www.google.com/maps/search/?api=1&query=' +
                      encodeURIComponent(chosen.site.name + ' ' + chosen.site.postcode)
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on map <ArrowUpRight size={16} />
                  </a>
                </div>
              )}
              <div className="urgent-next">
                <h3>Your next step</h3>
                <p>
                  {result.help?.message || 'NHS 111 can check which service is right for you.'} Do
                  not delay urgent help because of a wait time.
                </p>
                <a
                  className="urgent-primary"
                  href={result?.help?.url || 'https://111.nhs.uk/'}
                  target="_blank"
                  rel="noreferrer"
                >
                  {result.help?.label || 'Get help from NHS 111'} <ArrowUpRight size={19} />
                </a>
                <a
                  className="urgent-site-link"
                  href={chosen.site.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Centre details & access <ArrowUpRight size={14} />
                </a>
                <small>{chosen.site.access}</small>
              </div>
            </>
          ) : result ? (
            <div className="urgent-empty urgent-diversion">
              <AlertCircle size={34} />
              <h2>
                {result.status === 'emergency'
                  ? 'Get emergency help now.'
                  : result.status === 'outside-area'
                    ? 'Find your local service.'
                    : 'Let’s get you the right help.'}
              </h2>
              <p>{result.message}</p>
              <a
                className="urgent-primary"
                href={result.status === 'emergency' ? 'tel:999' : 'https://111.nhs.uk/'}
              >
                {result.status === 'emergency' ? 'Call 999' : 'Get help from NHS 111'}
                <ArrowUpRight size={18} />
              </a>
            </div>
          ) : (
            <div className="urgent-empty">
              <span className="urgent-empty-plus">
                <Plus size={34} strokeWidth={3} />
              </span>
              <h2>
                A clearer idea
                <br />
                before you go.
              </h2>
              <p>Your nearby centres and waiting-time range will appear here.</p>
              <div className="urgent-empty-line">
                <MapPin size={17} /> Search by UK postcode
              </div>
              <div className="urgent-empty-line">
                <Clock3 size={17} /> Tailored to your arrival time
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
