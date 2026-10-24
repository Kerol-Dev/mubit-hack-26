import { MubitBadge } from './MubitBadge';
import { useEffect, useRef, useState } from 'react';
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
import {
  centresWithEstimates,
  urgentConditions,
  type UrgentInput,
  type UrgentResult,
} from '../shared/urgent-care';
import './urgent-care.css';
export const urgentDemoConcern =
  'I twisted my ankle stepping off a kerb this morning. It is swollen and painful to walk on, but I can put some weight on it. There is no open wound or numbness.';
export function UrgentCare({
  onBack,
  initialPostcode = '',
}: {
  onBack: () => void;
  initialPostcode?: string;
}) {
  const [symptoms, setSymptoms] = useState(''),
    [postcode, setPostcode] = useState(initialPostcode),
    [condition, setCondition] = useState<UrgentInput['condition']>('Injury or sprain'),
    [screen, setScreen] = useState<'none' | 'emergency' | ''>(''),
    [adult, setAdult] = useState(true),
    [severity, setSeverity] = useState<NonNullable<UrgentInput['severity']> | ''>(''),
    [worsening, setWorsening] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<UrgentResult | null>(null),
    [selected, setSelected] = useState('');
  const resultsPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (busy || result) {
      resultsPanel.current?.focus({ preventScroll: true });
      resultsPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [busy, result]);
  useEffect(() => {
    setPostcode(initialPostcode);
    setResult(null);
    setSelected('');
  }, [initialPostcode]);
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
          severity,
          worsening,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Please try again.');
      setResult(data);
      setSelected(centresWithEstimates(data.results || [])[0]?.site.id || '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const estimatedCentres = centresWithEstimates(result?.results || []);
  const chosen = estimatedCentres.find((x) => x.site.id === selected) || estimatedCentres[0];
  const noEstimates =
    result && (result.status === 'estimate' || result.status === 'directory') && !chosen;
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
          <div className="urgent-heading-meta">
            <p>Find a nearby NHS centre. Know what to expect.</p>
            <MubitBadge label="Powered by Mubit" />
          </div>
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
                  setSeverity('moderate');
                  setWorsening(false);
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
              <fieldset className="urgent-impact">
                <legend>How much is it affecting you?</legend>
                <div className="urgent-impact-options">
                  {(['mild', 'moderate', 'severe'] as const).map((level) => (
                    <label key={level} className={severity === level ? 'selected ' + level : ''}>
                      <input
                        type="radio"
                        name="urgent-impact"
                        value={level}
                        checked={severity === level}
                        required
                        onChange={() => {
                          setSeverity(level);
                          reset();
                        }}
                      />
                      <strong>{level[0].toUpperCase() + level.slice(1)}</strong>
                      <small>
                        {level === 'mild'
                          ? 'Manageable'
                          : level === 'moderate'
                            ? 'Affecting my day'
                            : 'Hard to cope'}
                      </small>
                    </label>
                  ))}
                </div>
                <label className="urgent-worsening">
                  <input
                    type="checkbox"
                    checked={worsening}
                    onChange={(e) => {
                      setWorsening(e.target.checked);
                      reset();
                    }}
                  />{' '}
                  My symptoms are getting worse
                </label>
              </fieldset>
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
                  <button
                    className="urgent-primary"
                    disabled={busy || !screen || !severity}
                    type="submit"
                  >
                    {busy ? (
                      <>
                        <LoaderCircle className="spin" size={20} /> Preparing your Mubit forecast…
                      </>
                    ) : (
                      <>
                        {severity === 'severe' || worsening
                          ? 'Get urgent guidance'
                          : 'Find care & waiting times'}{' '}
                        <ArrowRight size={20} />
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
              centres. Only centres with an available forecast appear in these results. Waits are
              model estimates from synthetic historical encounters, not live NHS queue data or
              medical advice. Time means arrival to first treating clinician, not total visit time.
              Clinical priority can change the wait. Postcodes are looked up through postcodes.io;
              only concern and coarse arrival context go to Mubit. Model responses are not added to
              training.
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
        <section
          ref={resultsPanel}
          tabIndex={-1}
          className="urgent-results"
          aria-label="Waiting-time result"
          aria-live="polite"
          aria-busy={busy}
        >
          {busy ? (
            <div className="urgent-empty">
              <div className="urgent-orbit">
                <LoaderCircle size={34} className="spin" />
              </div>
              <MubitBadge label="Mubit · Waiting-time AI" />
              <h2>Preparing your forecast.</h2>
              <p>
                Checking your concern and finding supported centres. Mubit uses arrival context and
                historical visits for the forecast.
              </p>
            </div>
          ) : chosen && (result?.status === 'estimate' || result?.status === 'directory') ? (
            <>
              <div className={'urgent-priority ' + (severity || 'mild')}>
                <AlertCircle size={24} />
                <div>
                  <span>YOUR REPORTED SYMPTOMS</span>
                  <strong>{severity === 'moderate' ? 'Moderate impact' : 'Mild impact'}</strong>
                  <p>
                    {condition} · {worsening ? 'Getting worse' : 'Not getting worse'}
                  </p>
                </div>
              </div>
              <div className="urgent-result-label">
                <span>
                  <MapPin size={15} /> Centres with waiting times
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
                {estimatedCentres.map((x, i) => (
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
                      {x.lowMinutes}–{x.highMinutes}
                      <small>min</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className={'urgent-time-card ' + (severity || 'mild')}>
                <div className="urgent-time-heading">
                  <span>
                    <Clock3 size={17} /> Expected wait
                  </span>
                  {result.receipt && <MubitBadge inverse label="Via Mubit" />}
                </div>
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
              <p className="urgent-priority-note">
                The clinical team prioritises care. Reported impact does not guarantee a shorter
                wait.
              </p>
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
            <div className={'urgent-empty urgent-diversion ' + result.status}>
              <AlertCircle size={34} />
              {(result.status === 'review' || result.status === 'emergency') && (
                <span className="urgent-priority-label">
                  {result.status === 'emergency'
                    ? 'EMERGENCY · ACT NOW'
                    : 'URGENT ASSESSMENT NEEDED'}
                </span>
              )}
              <h2>
                {noEstimates
                  ? 'No nearby waiting times available.'
                  : result.status === 'emergency'
                    ? 'Get emergency help now.'
                    : result.status === 'outside-area'
                      ? 'Find your local service.'
                      : result.status === 'review'
                        ? 'Get advice now. Don’t wait for a forecast.'
                        : 'Let’s get you the right help.'}
              </h2>
              {result.receipt && <MubitBadge label="Request checked through Mubit" />}
              <p>
                {noEstimates
                  ? 'We only show centres with an available waiting-time estimate. You can still find local care through the service below.'
                  : result.message}
              </p>
              <a
                className="urgent-primary"
                href={
                  result.status === 'emergency'
                    ? 'tel:999'
                    : result.help?.url || 'https://111.nhs.uk/'
                }
              >
                {result.status === 'emergency'
                  ? 'Call 999'
                  : result.help?.label || 'Get help from NHS 111'}
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
