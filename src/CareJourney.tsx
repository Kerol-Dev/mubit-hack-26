import { useState, useEffect, useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Heart,
  Stethoscope,
  Pill,
  Activity,
  ClipboardList,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  FileText,
  MessageCircle,
  LoaderCircle,
  AlertCircle,
  Download,
  Sun,
  Sunset,
} from 'lucide-react';
import {
  services,
  type State,
  type Intake,
  type CareRequest,
  type Slot,
  type Appointment,
  type Booking,
  type Clinician,
  type Route,
} from '../shared/types';
const routeIcons: Record<Route, typeof Heart> = {
  gp: Stethoscope,
  nurse: Heart,
  pharmacy: Pill,
  physio: Activity,
  urgent: AlertCircle,
  emergency: AlertCircle,
  review: MessageCircle,
};
const dateLabel = (
  date: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
) =>
  new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    ...options,
  });
const todayUK = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
async function api<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const r = await fetch('/api' + path, {
    method: body === undefined ? 'GET' : method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'We couldn’t complete that. Please try again.');
  return d;
}
function Portrait({ person, size = '' }: { person: Clinician; size?: string }) {
  return (
    <span className={'journey-portrait ' + size}>
      <img
        src={'/images/' + person.id + '.jpg'}
        alt={`Stock portrait for ${person.name}, a fictional clinician`}
        style={{
          objectPosition:
            person.id === 'amara' ? '72% 20%' : person.id === 'olivia' ? '30% 20%' : '50% 23%',
        }}
      />
    </span>
  );
}
function Action({
  children,
  onClick,
  disabled = false,
  secondary = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  secondary?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      className={'journey-button ' + (secondary ? 'secondary' : '')}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function ErrorNotice({ error }: { error: string }) {
  return error ? (
    <div className="journey-error" role="alert">
      <AlertCircle size={18} />
      <span>{error}</span>
    </div>
  ) : null;
}
const stages = [
  'Symptoms',
  'Health details',
  'Review request',
  'Care options',
  'Appointment',
  'Confirmed',
];
export function CareFlow({
  state,
  initialRequest,
  replaceId,
  example,
  onClose,
  refresh,
  onAppointments,
}: {
  state: State;
  initialRequest?: CareRequest;
  replaceId?: string;
  example?: string;
  onClose: () => void;
  refresh: () => Promise<void>;
  onAppointments: () => void;
}) {
  const [stage, setStage] = useState(initialRequest ? 4 : 0),
    [input, setInput] = useState<Intake>({
      symptoms: '',
      duration: '',
      severity: 'mild',
      age: state.patient.age,
      pregnant: false,
      conditions: state.patient.conditions,
      medications: state.patient.medications,
      redFlags: [],
      goal: 'Advice and an appointment if needed',
      consent: false,
    }),
    [safety, setSafety] = useState(''),
    [request, setRequest] = useState(initialRequest),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [appointment, setAppointment] = useState<Appointment | null>(null),
    [confirmClose, setConfirmClose] = useState(false);
  const content = useRef<HTMLDivElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
    heading.current?.focus();
  }, [stage, busy]);
  const change = <K extends keyof Intake>(k: K, v: Intake[K]) => {
    setInput((p) => ({ ...p, [k]: v }));
    setError('');
  };
  const close = () => {
    if (busy) return;
    if (!request && input.symptoms.trim()) setConfirmClose(true);
    else onClose();
  };
  const next = () => {
    if (input.symptoms.trim().length < 15) {
      setError('Tell us a little more—at least 15 characters.');
      return;
    }
    setError('');
    setStage(1);
  };
  const sample = () => {
    setInput((p) => ({
      ...p,
      symptoms:
        example === 'physio'
          ? 'My shoulder has felt stiff after working at my desk for three weeks. No injury, chest pain, weakness or numbness. I would like some advice.'
          : example === 'gp'
            ? 'I have been feeling more tired than usual for about six weeks, despite getting enough sleep. I can do my normal activities but would like to discuss it.'
            : 'My throat has been a little sore for two days. I can swallow food and water normally and I feel otherwise well. I would like advice.',
      duration: example === 'physio' ? '1–4 weeks' : example === 'gp' ? 'Over a month' : '2–7 days',
    }));
    setError('');
  };
  const submit = async (human = false) => {
    if (safety !== 'no') {
      setError('Complete the safety check before continuing.');
      return;
    }
    if (!Number.isInteger(input.age) || input.age < 0 || input.age > 110) {
      setError('Enter an age between 0 and 110.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await api<CareRequest>('/requests', { input, human });
      setRequest(r);
      setStage(3);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const book = async (slot: Slot) => {
    if (!request) return;
    setBusy(true);
    setError('');
    try {
      const b = await api<Booking>('/bookings', {
        requestId: request.id,
        slotId: slot.id,
        ...(replaceId ? { replaceId } : {}),
      });
      setAppointment({
        ...b,
        slot,
        clinician: state.clinicians.find((c) => c.id === slot.clinicianId)!,
      });
      setStage(5);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const humanReview = async () => {
    if (!request) return;
    setBusy(true);
    setError('');
    try {
      setRequest(
        await api<CareRequest>(
          '/staff/requests/' + request.id,
          { route: 'review', notes: 'Patient requested a practice team review before booking.' },
          'PATCH',
        ),
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const progress = Math.min(stage, 4);
  const editStep = (n: number) => {
    if (busy) return;
    setError('');
    setStage(n);
  };
  const review = () => {
    if (!input.duration) {
      setError('Choose how long this has been happening.');
      return;
    }
    if (safety !== 'no') {
      setError('Complete the safety check before continuing.');
      return;
    }
    if (!Number.isInteger(input.age) || input.age < 0 || input.age > 110) {
      setError('Enter an age between 0 and 110.');
      return;
    }
    editStep(2);
  };
  return (
    <Dialog.Root open onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="journey-overlay" />
        <Dialog.Content
          className={
            'care-journey care-studio ' +
            (stage >= 3 ? 'care-studio-wide' : '') +
            (stage === 4 ? ' care-studio-appointment' : '')
          }
          aria-describedby="journey-description"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            close();
          }}
        >
          <Dialog.Title className="sr-only">Your path to care</Dialog.Title>
          <Dialog.Description id="journey-description" className="sr-only">
            Describe your symptoms, review a suggested service, and choose a fictional appointment.
          </Dialog.Description>
          <header className="journey-header">
            <span className="journey-brand">
              wellby<span>.</span>
            </span>
            <span className="journey-header-label">Willowbrook Medical Centre</span>
            <div>
              <span className="journey-demo">Fictional care portal</span>
              <button
                className="journey-close"
                disabled={busy}
                onClick={close}
                aria-label="Close care request"
              >
                <X size={20} />
              </button>
            </div>
          </header>
          <nav className="care-progress" aria-label="Care request progress">
            {stages.slice(0, 5).map((label, i) => (
              <button
                type="button"
                key={label}
                disabled={busy || stage === 5 || !(i < stage && (request ? i >= 3 : i < 3))}
                onClick={() => editStep(i)}
                className={stage > i ? 'complete' : stage === i ? 'active' : ''}
                aria-current={stage === i ? 'step' : undefined}
              >
                <span>{stage > i ? <Check size={15} /> : String(i + 1).padStart(2, '0')}</span>
                <strong>{label}</strong>
                {i < 4 && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
          <div className="journey-shell">
            <div className="journey-scroll" ref={content}>
              {confirmClose ? (
                <section className="journey-leave">
                  <span className="journey-large-icon">
                    <FileText size={28} />
                  </span>
                  <h2>Leave this request?</h2>
                  <p>
                    Your symptoms haven’t been submitted yet. Closing will discard what you’ve
                    entered.
                  </p>
                  <Action onClick={() => setConfirmClose(false)}>
                    Keep writing
                    <ArrowRight size={17} />
                  </Action>
                  <Action secondary onClick={onClose}>
                    Discard and close
                  </Action>
                </section>
              ) : (
                <>
                  <div className="journey-mobile-progress">
                    <span>STEP {Math.min(stage + 1, 5)} OF 5</span>
                    <strong>{stages[stage]}</strong>
                    <div>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <i key={i} className={progress >= i ? 'filled' : ''} />
                      ))}
                    </div>
                  </div>
                  {busy && stage < 3 ? (
                    <section className="journey-processing" role="status" aria-live="polite">
                      <div className="processing-icon">
                        <LoaderCircle size={32} />
                      </div>
                      <span className="journey-kicker">FINDING YOUR NEXT STEP</span>
                      <h2 ref={heading} tabIndex={-1}>
                        Reviewing your request
                      </h2>
                      <p>
                        We’re reviewing your description to suggest a suitable service. You’ll be
                        able to review it before booking.
                      </p>
                      <div className="processing-summary">
                        <FileText size={17} />
                        <span>{input.symptoms}</span>
                      </div>
                      <div className="care-processing-steps">
                        <span>
                          <CheckCircle2 size={17} />
                          Your description is ready
                        </span>
                        <span>
                          <LoaderCircle size={17} className="spin" />
                          Waiting for your care suggestion
                        </span>
                        <span>
                          <CalendarDays size={17} />
                          Review options, then choose a time
                        </span>
                      </div>
                      <small>Keep this window open. No appointment has been booked.</small>
                    </section>
                  ) : (
                    <>
                      <ErrorNotice error={error} />
                      {stage === 0 && (
                        <>
                          <div className="journey-heading">
                            <span className="journey-kicker">LET’S START WITH YOU</span>
                            <h2 ref={heading} tabIndex={-1}>
                              How can we help?
                            </h2>
                            <p>Describe your symptoms in your own words.</p>
                          </div>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              next();
                            }}
                            className="journey-form"
                          >
                            <section className="journey-panel">
                              <div className="journey-panel-title">
                                <span>
                                  <MessageCircle size={18} />
                                </span>
                                <div>
                                  <h3>Your symptoms or concern</h3>
                                </div>
                                <button type="button" className="journey-sample" onClick={sample}>
                                  Use a demo example
                                  <ArrowUpRight size={13} />
                                </button>
                              </div>
                              <label className="sr-only" htmlFor="journey-symptoms">
                                Describe your symptoms
                              </label>
                              <textarea
                                autoFocus
                                id="journey-symptoms"
                                value={input.symptoms}
                                onChange={(e) => change('symptoms', e.target.value)}
                                minLength={15}
                                maxLength={3000}
                                required
                                placeholder="Tell us what’s happening…"
                              />
                              <div className="journey-input-foot">
                                <span>Where it hurts, when it started, what has changed.</span>
                                <span>{input.symptoms.length.toLocaleString()} / 3,000</span>
                              </div>
                            </section>
                            <details className="simple-goal">
                              <summary>
                                Add what you’d like help with <Plus size={14} />
                              </summary>
                              <fieldset className="journey-fieldset care-goal">
                                <legend>What would you like help with?</legend>
                                <div className="care-goal-options">
                                  {[
                                    'Advice and an appointment if needed',
                                    'Understanding my symptoms',
                                    'Reviewing an ongoing concern',
                                  ].map((goal) => (
                                    <button
                                      type="button"
                                      key={goal}
                                      aria-pressed={input.goal === goal}
                                      className={input.goal === goal ? 'selected' : ''}
                                      onClick={() => change('goal', goal)}
                                    >
                                      <span className="care-goal-radio">
                                        {input.goal === goal && <Check size={11} />}
                                      </span>
                                      {goal}
                                    </button>
                                  ))}
                                </div>
                              </fieldset>
                            </details>
                            <div className="journey-action-bar">
                              <span>
                                <LockNote />
                                Next: a few health details
                              </span>
                              <Action type="submit">
                                Continue
                                <ArrowRight size={17} />
                              </Action>
                            </div>
                          </form>
                        </>
                      )}
                      {stage === 1 && (
                        <>
                          <button
                            className="journey-back"
                            onClick={() => {
                              setError('');
                              setStage(0);
                            }}
                          >
                            <ArrowLeft size={15} />
                            Back to your symptoms
                          </button>
                          <div className="journey-heading">
                            <span className="journey-kicker">YOUR HEALTH CONTEXT</span>
                            <h2 ref={heading} tabIndex={-1}>
                              A little about your symptoms
                            </h2>
                            <p>This helps us suggest the right service.</p>
                          </div>
                          <form
                            className="journey-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              review();
                            }}
                          >
                            <fieldset className="journey-fieldset">
                              <legend>How long has this been happening?</legend>
                              <div className="duration-options">
                                {[
                                  'Just now',
                                  'Today',
                                  '2–7 days',
                                  '1–4 weeks',
                                  'Over a month',
                                  'Routine / planned care',
                                ].map((d) => (
                                  <button
                                    type="button"
                                    aria-pressed={input.duration === d}
                                    key={d}
                                    className={input.duration === d ? 'selected' : ''}
                                    onClick={() => change('duration', d)}
                                  >
                                    {d}
                                    {input.duration === d && <Check size={13} />}
                                  </button>
                                ))}
                              </div>
                            </fieldset>{' '}
                            <fieldset className="journey-fieldset">
                              <legend>How does it feel?</legend>
                              <div className="severity-options">
                                {(
                                  [
                                    {
                                      id: 'mild',
                                      name: 'Mild',
                                      detail: 'Noticeable, but manageable',
                                    },
                                    {
                                      id: 'moderate',
                                      name: 'Moderate',
                                      detail: 'Affecting my usual day',
                                    },
                                    {
                                      id: 'severe',
                                      name: 'Severe',
                                      detail: 'Severe or getting much worse',
                                    },
                                  ] as const
                                ).map((s) => (
                                  <button
                                    type="button"
                                    key={s.id}
                                    aria-pressed={input.severity === s.id}
                                    className={input.severity === s.id ? 'selected' : ''}
                                    onClick={() => change('severity', s.id)}
                                  >
                                    <span className={'severity-symbol ' + s.id}>
                                      <i />
                                      <i />
                                      <i />
                                    </span>
                                    <strong>{s.name}</strong>
                                    <small>{s.detail}</small>
                                    <span className="choice-ring">
                                      {input.severity === s.id && <Check size={11} />}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </fieldset>
                            <details className="journey-health-fields care-profile-disclosure">
                              <summary>
                                <div>
                                  <Heart size={18} />
                                  <span>
                                    <strong>Your health profile</strong>
                                    <small>
                                      {input.age} years old ·{' '}
                                      {input.conditions.trim() || 'No conditions added'}
                                    </small>
                                  </span>
                                </div>
                                <span>
                                  Check & edit
                                  <Plus size={15} />
                                </span>
                              </summary>
                              <div className="journey-two-fields">
                                <label>
                                  Age
                                  <input
                                    type="number"
                                    min={0}
                                    max={110}
                                    required
                                    value={input.age}
                                    onChange={(e) => change('age', Number(e.target.value))}
                                  />
                                </label>
                                <label>
                                  Pregnant or possibly pregnant?
                                  <select
                                    value={input.pregnant ? 'yes' : 'no'}
                                    onChange={(e) => change('pregnant', e.target.value === 'yes')}
                                  >
                                    <option value="no">No / not applicable</option>
                                    <option value="yes">Yes / possibly</option>
                                  </select>
                                </label>
                                <label>
                                  Existing conditions
                                  <textarea
                                    maxLength={600}
                                    value={input.conditions}
                                    onChange={(e) => change('conditions', e.target.value)}
                                  />
                                </label>
                                <label>
                                  Medicines you take
                                  <textarea
                                    maxLength={600}
                                    value={input.medications}
                                    onChange={(e) => change('medications', e.target.value)}
                                  />
                                </label>
                              </div>
                            </details>
                            <section
                              className={'journey-safety ' + (safety === 'yes' ? 'emergency' : '')}
                            >
                              <div className="journey-section-heading">
                                <h3>
                                  <ShieldCheck size={19} />A quick safety check
                                </h3>
                                <span>Required</span>
                              </div>
                              <p>
                                Are you having severe breathing difficulty, ongoing crushing chest
                                pain, sudden face or arm weakness, uncontrolled bleeding, or another
                                life-threatening emergency?
                              </p>
                              <div className="safety-choices">
                                {[
                                  ['no', 'No, none of these'],
                                  ['yes', 'Yes / I think so'],
                                ].map(([value, label]) => (
                                  <label key={value} className={safety === value ? 'selected' : ''}>
                                    <input
                                      type="radio"
                                      name="safety"
                                      checked={safety === value}
                                      required
                                      onChange={() => {
                                        setSafety(value);
                                        change(
                                          'redFlags',
                                          value === 'yes'
                                            ? ['Possible life-threatening symptom reported']
                                            : [],
                                        );
                                      }}
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                              {safety === 'yes' && (
                                <div className="journey-emergency" role="alert">
                                  <AlertCircle size={20} />
                                  <div>
                                    <strong>Call 999 now.</strong>
                                    <p>Do not wait for this form or an appointment.</p>
                                  </div>
                                </div>
                              )}
                            </section>
                            <div className="journey-action-bar">
                              <span>
                                <ShieldCheck size={15} />
                                You’ll review this before sending
                              </span>
                              <Action type="submit" disabled={busy || safety === 'yes'}>
                                Review my request
                                <ArrowRight size={17} />
                              </Action>
                            </div>
                          </form>
                        </>
                      )}
                      {stage === 2 && (
                        <>
                          <button className="journey-back" onClick={() => editStep(1)}>
                            <ArrowLeft size={15} />
                            Back to health details
                          </button>
                          <div className="journey-heading">
                            <span className="journey-kicker">READY WHEN YOU ARE</span>
                            <h2 ref={heading} tabIndex={-1}>
                              Review your request
                            </h2>
                            <p>
                              Check your request before we suggest a care option. Nothing has been
                              sent yet.
                            </p>
                          </div>
                          <section className="care-review-card">
                            <header>
                              <span>
                                <MessageCircle size={19} />
                                Your concern
                              </span>
                              <button onClick={() => editStep(0)}>Edit symptoms</button>
                            </header>
                            <p>{input.symptoms}</p>
                            <p className="care-review-goal">Looking for: {input.goal}</p>
                            <div className="care-review-tags">
                              <span>
                                <Clock3 size={14} />
                                {input.duration}
                              </span>
                              <span>
                                {input.severity[0].toUpperCase() + input.severity.slice(1)} impact
                              </span>
                            </div>
                          </section>
                          <section className="care-review-card">
                            <header>
                              <span>
                                <Heart size={19} />
                                Health details
                              </span>
                              <button onClick={() => editStep(1)}>Edit details</button>
                            </header>
                            <dl>
                              <div>
                                <dt>Age</dt>
                                <dd>{input.age}</dd>
                              </div>
                              <div>
                                <dt>Pregnant or possibly pregnant</dt>
                                <dd>{input.pregnant ? 'Yes / possibly' : 'No / not applicable'}</dd>
                              </div>
                              <div>
                                <dt>Existing conditions</dt>
                                <dd>{input.conditions.trim() || 'None added'}</dd>
                              </div>
                              <div>
                                <dt>Current medicines</dt>
                                <dd>{input.medications.trim() || 'None added'}</dd>
                              </div>
                            </dl>
                            <div className="care-review-safety">
                              <CheckCircle2 size={17} />
                              Safety check completed · none of the listed emergency symptoms
                            </div>
                          </section>
                          <div className="journey-action-bar">
                            <button
                              className="journey-text-button"
                              onClick={() => void submit(true)}
                            >
                              Send to practice team instead
                            </button>
                            <Action onClick={() => void submit()}>
                              Send care request
                              <ArrowRight size={17} />
                            </Action>
                          </div>
                        </>
                      )}
                      {stage === 3 && request && (
                        <>
                          <div className="journey-heading">
                            <span className="journey-kicker">YOUR CARE OPTIONS</span>
                            <h2 ref={heading} tabIndex={-1}>
                              {request.status === 'urgent'
                                ? 'Please get help now.'
                                : request.status === 'review'
                                  ? 'Your request is with the care team.'
                                  : 'Your suggested next step.'}
                            </h2>
                            <p>{request.decision.summary}</p>
                          </div>
                          <Recommendation request={request} state={state} />
                          <div className="journey-action-bar">
                            {request.status === 'awaiting_booking' ? (
                              <>
                                <button
                                  className="journey-text-button"
                                  disabled={busy}
                                  onClick={() => void humanReview()}
                                >
                                  {busy ? 'Sending for review…' : 'Ask the care team to review'}
                                </button>
                                <Action
                                  disabled={busy}
                                  onClick={() => {
                                    setError('');
                                    setStage(4);
                                  }}
                                >
                                  Choose an appointment
                                  <ArrowRight size={17} />
                                </Action>
                              </>
                            ) : (
                              <>
                                <span>Saved in your care requests</span>
                                <Action secondary onClick={onClose}>
                                  Return to portal
                                  <ArrowRight size={17} />
                                </Action>
                              </>
                            )}
                          </div>
                        </>
                      )}
                      {stage === 4 && request && (
                        <>
                          <button
                            className="journey-back"
                            disabled={busy}
                            onClick={() => {
                              setError('');
                              setStage(3);
                            }}
                          >
                            <ArrowLeft size={15} />
                            Back to care options
                          </button>
                          <div className="journey-heading">
                            <span className="journey-kicker">BOOK YOUR VISIT</span>
                            <h2 ref={heading} tabIndex={-1}>
                              {replaceId ? 'Let’s find a better time.' : 'Choose your appointment'}
                            </h2>
                            <p>
                              {services[request.decision.route].label} ·{' '}
                              {services[request.decision.route].duration} minutes · All times are UK
                              local time
                            </p>
                          </div>
                          {replaceId && (
                            <div className="journey-reschedule">
                              <CalendarDays size={17} />
                              <span>
                                Your current appointment stays booked until you confirm a new time.
                              </span>
                            </div>
                          )}
                          <AppointmentPicker
                            state={state}
                            request={request}
                            busy={busy}
                            onBook={book}
                            replacing={!!replaceId}
                          />
                        </>
                      )}
                      {stage === 5 && appointment && (
                        <section className="journey-confirmation">
                          <span className="journey-success-mark">
                            <Check size={31} />
                          </span>
                          <span className="journey-kicker">YOU’RE ALL SET</span>
                          <h2 ref={heading} tabIndex={-1}>
                            {replaceId
                              ? 'Your new time is confirmed.'
                              : 'Your appointment is confirmed.'}
                          </h2>
                          <p>Your appointment is saved. Find all the details in your portal.</p>
                          <div className="journey-confirmation-ticket">
                            <div className="ticket-top">
                              <span>
                                <CheckCircle2 size={15} />
                                Appointment confirmed
                              </span>
                              <span>{appointment.id}</span>
                            </div>
                            <div className="ticket-person">
                              <Portrait person={appointment.clinician} size="large" />
                              <div>
                                <h3>{appointment.clinician.name}</h3>
                                <p>{appointment.clinician.title}</p>
                              </div>
                            </div>
                            <div className="ticket-details">
                              <div>
                                <CalendarDays size={18} />
                                <span>
                                  <small>DATE & TIME</small>
                                  <strong>{dateLabel(appointment.slot.date)}</strong>
                                  <span>
                                    {appointment.slot.time} ·{' '}
                                    {services[appointment.slot.route].duration} minutes
                                  </span>
                                </span>
                              </div>
                              <div>
                                {appointment.slot.mode === 'Telephone' ? (
                                  <Phone size={18} />
                                ) : (
                                  <MapPin size={18} />
                                )}
                                <span>
                                  <small>
                                    {appointment.slot.mode === 'Telephone'
                                      ? 'PHONE CONSULTATION'
                                      : 'LOCATION'}
                                  </small>
                                  <strong>
                                    {appointment.slot.mode === 'Telephone'
                                      ? 'Telephone appointment'
                                      : appointment.clinician.location}
                                  </strong>
                                  <span>
                                    {appointment.slot.mode === 'Telephone'
                                      ? 'Check your contact number in My profile.'
                                      : 'In-person visit · Fictional practice'}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="ticket-bottom">
                              <FileText size={15} />
                              {appointment.reason}
                            </div>
                          </div>
                          <div className="confirmation-actions">
                            <a
                              href={'/api/bookings/' + appointment.id + '/calendar'}
                              download
                              className="journey-button secondary"
                            >
                              <Download size={16} />
                              Add to calendar
                            </a>
                            <Action onClick={onAppointments}>
                              View appointment
                              <ArrowRight size={17} />
                            </Action>
                          </div>
                          <small>
                            Demo booking only. No real clinician or NHS service has been booked.
                          </small>
                        </section>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function LockNote() {
  return <ShieldCheck size={14} />;
}
function Recommendation({ request: r, state }: { request: CareRequest; state: State }) {
  const Icon = routeIcons[r.decision.route],
    team = state.clinicians.filter((c) => c.role === r.decision.route);
  return (
    <>
      <section className={'journey-recommendation ' + (r.status === 'urgent' ? 'urgent' : '')}>
        <div className="recommendation-heading">
          <span className="journey-service-icon">
            <Icon size={27} />
          </span>
          <div>
            <span className="journey-kicker">
              {r.status === 'urgent'
                ? 'PLEASE ACT NOW'
                : r.status === 'review'
                  ? 'PRACTICE TEAM REVIEW'
                  : 'SUGGESTED SERVICE'}
            </span>
            <h3>{services[r.decision.route].name}</h3>
          </div>
          {r.status === 'awaiting_booking' && (
            <span className="journey-duration">
              <Clock3 size={13} />
              {services[r.decision.route].duration} min
            </span>
          )}
        </div>
        <h4>Why this care?</h4>
        <p>{r.decision.reason}</p>
        <div className="recommendation-next">
          <ArrowRight size={18} />
          <div>
            <strong>Your next step</strong>
            <p>{r.decision.nextStep}</p>
          </div>
        </div>
        {!!team.length && (
          <div className="recommendation-team">
            <div>
              {team.slice(0, 3).map((c) => (
                <Portrait key={c.id} person={c} />
              ))}
            </div>
            <p>
              <strong>Your Willowbrook care team</strong>
              <span>{team.map((c) => c.name).join(' · ')}</span>
            </p>
          </div>
        )}
      </section>
      <div className="journey-safety-net">
        <ShieldCheck size={19} />
        <div>
          <strong>
            {r.status === 'urgent' ? 'Don’t wait for an online response' : 'If things change'}
          </strong>
          <p>
            {r.status === 'urgent'
              ? r.decision.route === 'emergency'
                ? 'Call 999 now. Do not wait for an online response.'
                : 'Contact NHS 111 now or your practice for same-day help. Do not wait for a routine appointment.'
              : r.decision.safetyNet}
          </p>
        </div>
      </div>
      <details className="journey-request-recap">
        <summary>
          <FileText size={15} />
          Your submitted symptoms
          <Plus size={15} />
        </summary>
        <p>{r.input.symptoms}</p>
        <small>
          {r.input.duration} · {r.input.severity} · Reference {r.id}
        </small>
      </details>
      {r.status === 'review' && (
        <p className="journey-demo-note">
          Saved for the fictional practice team. No real clinician is monitoring this demo.
        </p>
      )}
    </>
  );
}
function AppointmentPicker({
  state,
  request,
  busy,
  onBook,
  replacing,
}: {
  state: State;
  request: CareRequest;
  busy: boolean;
  onBook: (s: Slot) => Promise<void>;
  replacing: boolean;
}) {
  const [slots, setSlots] = useState<Slot[]>([]),
    [clinician, setClinician] = useState(''),
    [mode, setMode] = useState(''),
    [day, setDay] = useState(''),
    [week, setWeek] = useState(0),
    [selected, setSelected] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0);
  const bookingSummary = useRef<HTMLElement>(null);
  const today = todayUK(),
    weekday = new Date(today + 'T12:00:00Z').getUTCDay(),
    monday = addDays(today, -((weekday + 6) % 7)),
    weekStart = addDays(monday, week * 7),
    days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    maxDate = addDays(today, 28);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelected('');
    setSlots([]);
    api<Slot[]>('/slots?' + new URLSearchParams({ requestId: request.id, clinician, mode }))
      .then((data) => {
        if (!active) return;
        setSlots(data);
        setDay(data[0]?.date || '');
        setWeek(
          data[0]
            ? Math.floor(
                (Date.parse(data[0].date + 'T12:00:00Z') - Date.parse(monday + 'T12:00:00Z')) /
                  604800000,
              )
            : 0,
        );
        setError('');
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request.id, clinician, mode, reload, monday]);
  const selectedSlot = slots.find((s) => s.id === selected),
    doctor = state.clinicians.find((c) => c.id === selectedSlot?.clinicianId),
    team = state.clinicians.filter((c) => c.role === request.decision.route),
    daySlots = slots.filter((s) => s.date === day);
  const changeWeek = (n: number) => {
    setWeek(n);
    setSelected('');
    const start = addDays(monday, n * 7);
    setDay(slots.find((s) => s.date >= start && s.date <= addDays(start, 6))?.date || '');
  };
  const confirm = async () => {
    if (!selectedSlot) return;
    try {
      await onBook(selectedSlot);
    } catch {
      setSelected('');
      setReload((v) => v + 1);
    }
  };
  return (
    <div className="journey-booking">
      <div className="journey-availability">
        <div className="diary-heading">
          <div>
            <span>THE PRACTICE DIARY</span>
            <h3>Find a time that works for you.</h3>
          </div>
          <span>
            <Clock3 size={14} />
            UK time
          </span>
        </div>
        <fieldset disabled={busy || loading} className="journey-fieldset clinician-choice">
          <legend>1. Choose your clinician</legend>
          <div className="clinician-choices">
            <button
              onClick={() => setClinician('')}
              className={!clinician ? 'selected' : ''}
              aria-pressed={!clinician}
            >
              <span className="any-clinician">
                <CalendarDays size={21} />
              </span>
              <span>
                <strong>First available</strong>
                <small>Find the soonest time</small>
              </span>
              {!clinician && <Check size={15} />}
            </button>
            {team.map((c) => (
              <button
                key={c.id}
                onClick={() => setClinician(c.id)}
                className={clinician === c.id ? 'selected' : ''}
                aria-pressed={clinician === c.id}
              >
                <Portrait person={c} />
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.title}</small>
                </span>
                {clinician === c.id && <Check size={15} />}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="appointment-mode" role="group" aria-label="Appointment type">
          {[
            ['', 'All visits'],
            ['In person', 'In person'],
            ['Telephone', 'Telephone'],
          ].map(([v, label]) => (
            <button
              key={v}
              disabled={busy || loading}
              aria-pressed={mode === v}
              className={mode === v ? 'selected' : ''}
              onClick={() => setMode(v)}
            >
              {v === 'Telephone' ? (
                <Phone size={14} />
              ) : v === 'In person' ? (
                <MapPin size={14} />
              ) : (
                <CalendarDays size={14} />
              )}{' '}
              {label}
            </button>
          ))}
        </div>
        <section className="journey-calendar">
          <div className="journey-calendar-heading">
            <div>
              <h3>
                {dateLabel(weekStart, { month: 'long', year: 'numeric' })}
                {weekStart.slice(5, 7) !== addDays(weekStart, 6).slice(5, 7)
                  ? ' / ' + dateLabel(addDays(weekStart, 6), { month: 'short' })
                  : ''}
              </h3>
              <span>2. Choose a date</span>
            </div>
            <div>
              <button
                disabled={busy || loading || week === 0}
                aria-label="Previous week"
                onClick={() => changeWeek(week - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={busy || loading || addDays(weekStart, 7) > maxDate}
                aria-label="Next week"
                onClick={() => changeWeek(week + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="journey-week">
            {days.map((d) => {
              const n = slots.filter((s) => s.date === d).length;
              return (
                <button
                  key={d}
                  disabled={busy || loading || !n}
                  aria-pressed={day === d}
                  aria-label={dateLabel(d) + ', ' + n + ' available times'}
                  className={day === d ? 'selected' : ''}
                  onClick={() => {
                    setDay(d);
                    setSelected('');
                  }}
                >
                  <span>{dateLabel(d, { weekday: 'short' })}</span>
                  <strong>{dateLabel(d, { day: 'numeric' })}</strong>
                  <i className={n ? 'available' : ''} />
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>
              <i />
              Available appointments
            </span>
            <button
              disabled={loading || busy || !slots.length}
              onClick={() => {
                const s = slots[0];
                setDay(s.date);
                setWeek(
                  Math.floor(
                    (Date.parse(s.date + 'T12:00:00Z') - Date.parse(monday + 'T12:00:00Z')) /
                      604800000,
                  ),
                );
                setSelected(s.id);
              }}
            >
              First available
              <ArrowRight size={12} />
            </button>
          </div>
        </section>
        <ErrorNotice error={error} />
        {loading ? (
          <div className="slots-loading" role="status">
            <LoaderCircle size={21} className="spin" />
            Checking the practice diary…
          </div>
        ) : !slots.length ? (
          <div className="journey-no-slots">
            <CalendarDays size={25} />
            <h3>{error ? 'The diary couldn’t be loaded.' : 'No times match these filters.'}</h3>
            <p>
              {error
                ? 'Try loading the appointment times again.'
                : 'Try another clinician or visit type. Availability covers the next four weeks.'}
            </p>
            <Action
              secondary
              onClick={() => {
                setClinician('');
                setMode('');
                setReload((v) => v + 1);
              }}
            >
              {error ? 'Try again' : 'Reset filters'}
            </Action>
          </div>
        ) : !day ? (
          <div className="journey-no-slots">
            <CalendarDays size={25} />
            <h3>No appointments this week.</h3>
            <p>Move to another week or choose First available.</p>
          </div>
        ) : (
          <div className="journey-time-groups">
            <div className="times-heading">
              <h3>
                <span>3. Choose a time</span>
                {dateLabel(day, { weekday: 'long', day: 'numeric', month: 'short' })}
              </h3>
              <span>{daySlots.length} available</span>
            </div>
            {[
              { label: 'Morning', icon: Sun, test: (s: Slot) => s.time < '12:00' },
              { label: 'Afternoon', icon: Sunset, test: (s: Slot) => s.time >= '12:00' },
            ].map((group) => {
              const values = daySlots.filter(group.test);
              return (
                values.length > 0 && (
                  <div className="time-group" key={group.label}>
                    <h4>
                      <group.icon size={14} />
                      {group.label}
                    </h4>
                    <div>
                      {values.map((s) => {
                        const c = state.clinicians.find((c) => c.id === s.clinicianId)!;
                        return (
                          <button
                            disabled={busy}
                            key={s.id}
                            aria-pressed={selected === s.id}
                            className={selected === s.id ? 'selected' : ''}
                            onClick={() => setSelected(s.id)}
                          >
                            <strong>{s.time}</strong>
                            <span>{c.name}</span>
                            <small>{s.mode}</small>
                            <i className="choice-ring">
                              {selected === s.id && <Check size={11} />}
                            </i>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              );
            })}
          </div>
        )}
      </div>
      <aside className="journey-booking-summary" ref={bookingSummary} tabIndex={-1}>
        <div className="summary-heading">
          <ClipboardList size={17} />
          <strong>Your visit</strong>
          <span>{selectedSlot ? 'Ready to book' : 'Not selected'}</span>
        </div>
        {selectedSlot && doctor ? (
          <>
            <div className="summary-person">
              <Portrait person={doctor} size="large" />
              <h3>{doctor.name}</h3>
              <p>{doctor.title}</p>
              <span>{services[selectedSlot.route].label}</span>
            </div>
            <div className="summary-facts">
              <div>
                <CalendarDays size={17} />
                <span>
                  <small>DATE</small>
                  <strong>
                    {dateLabel(selectedSlot.date, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </strong>
                </span>
              </div>
              <div>
                <Clock3 size={17} />
                <span>
                  <small>TIME</small>
                  <strong>
                    {selectedSlot.time} <em>· {services[selectedSlot.route].duration} minutes</em>
                  </strong>
                </span>
              </div>
              <div>
                {selectedSlot.mode === 'Telephone' ? <Phone size={17} /> : <MapPin size={17} />}
                <span>
                  <small>{selectedSlot.mode === 'Telephone' ? 'CONSULTATION' : 'LOCATION'}</small>
                  <strong>
                    {selectedSlot.mode === 'Telephone' ? 'Telephone appointment' : doctor.location}
                  </strong>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="summary-placeholder">
            <span>
              <CalendarDays size={28} />
            </span>
            <h3>{services[request.decision.route].label}</h3>
            <p>{services[request.decision.route].description}</p>
            <dl className="booking-empty-facts">
              <div>
                <dt>Duration</dt>
                <dd>{services[request.decision.route].duration} minutes</dd>
              </div>
              <div>
                <dt>Where</dt>
                <dd>Willowbrook practice</dd>
              </div>
            </dl>
            <p className="booking-empty-hint">
              Select a date and time. Your visit details will appear here.
            </p>
          </div>
        )}
        <div className="summary-confirm">
          <Action disabled={!selectedSlot || busy || loading} onClick={() => void confirm()}>
            {busy ? (
              <>
                <LoaderCircle size={16} className="spin" />
                Confirming…
              </>
            ) : (
              <>
                {replacing ? 'Confirm new time' : 'Confirm appointment'}
                <ArrowRight size={16} />
              </>
            )}
          </Action>
          <small>
            {selectedSlot
              ? 'Your time is reserved when you confirm.'
              : 'Select an available time to continue.'}
          </small>
        </div>
        <p className="summary-demo">
          <ShieldCheck size={13} />
          Fictional appointment · No real booking
        </p>
      </aside>
      {selectedSlot && doctor && (
        <div className="care-mobile-selection">
          <div>
            <strong>
              {selectedSlot.time} ·{' '}
              {dateLabel(selectedSlot.date, { day: 'numeric', month: 'short' })}
            </strong>
            <span>{doctor.name}</span>
          </div>
          <button
            onClick={() => {
              bookingSummary.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              bookingSummary.current?.focus({ preventScroll: true });
            }}
          >
            Review visit
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
