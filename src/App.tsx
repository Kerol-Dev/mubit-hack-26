import { UrgentCareWorkspace } from './UrgentCareWorkspace';
import { UrgentCare } from './UrgentCare';
import type { CarePreference } from '../shared/departments';
import { SupportChat } from './SupportChat';
import { RequestProgress } from './RequestProgress';
import { PracticeHome } from './PracticeHome';
import { EndpointComparison as Comparison } from './EndpointComparison';
import { Departments } from './Departments';
import { CareFlow } from './CareJourney';
import { useState, useEffect, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  X,
  Check,
  CheckCircle2,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  Video,
  Heart,
  Stethoscope,
  Pill,
  Activity,
  MessageCircle,
  ShieldCheck,
  LockKeyhole,
  Leaf,
  FileText,
  Search,
  Settings2,
  Users,
  HelpCircle,
  Bell,
  Menu,
  Download,
  LoaderCircle,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
  ClipboardList,
  MoveUpRight,
  Mail,
} from 'lucide-react';
import {
  services,
  type State,
  type Route,
  type CareRequest,
  type Intake,
  type Appointment,
  type Slot,
  type Clinician,
  type HistoricalCase,
} from '../shared/types';
import { AuthScreen, SetupScreen, ProfileEditor, type DemoUser } from './Auth';
const icons: Record<Route, typeof Heart> = {
  gp: Stethoscope,
  pharmacy: Pill,
  nurse: Heart,
  physio: Activity,
  urgent: AlertCircle,
  emergency: AlertCircle,
  review: MessageCircle,
};
const formatDate = (
  date: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
) =>
  new Date(date.length === 10 ? date + 'T12:00:00Z' : date).toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    ...opts,
  });
const api = async <T = any,>(path: string, body?: unknown, method = 'POST'): Promise<T> => {
  const r = await fetch('/api' + path, {
    method: body === undefined ? 'GET' : method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Please try again.');
  return d;
};
function Logo() {
  return (
    <span className="logo practice-brand">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M15 5h10v10h10v10H25v10H15V25H5V15h10Z" fill="currentColor" />
        <path d="M20 9v22M9 20h22" stroke="var(--paper,#faf9f6)" strokeWidth="1" opacity=".35" />
      </svg>
      <span className="brand-word">
        wellby<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`button ${secondary ? 'secondary' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Avatar({ c, large = false }: { c: Clinician; large?: boolean }) {
  return (
    <span className={`avatar photo-avatar ${c.color} ${large ? 'large' : ''}`}>
      <img
        src={`/images/${c.photoId || c.id}.jpg`}
        alt={`Stock portrait for ${c.name}, a fictional clinician`}
        style={{
          objectPosition: (
            {
              amara: '72% 20%',
              james: '50% 26%',
              sarah: '50% 22%',
              ravi: '52% 12%',
              olivia: '30% 20%',
            } as Record<string, string>
          )[c.id],
        }}
      />
      <i>
        <Check size={10} />
      </i>
    </span>
  );
}
function ErrorBox({ text }: { text: string }) {
  return text ? (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      <span>{text}</span>
    </div>
  ) : null;
}
function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className={`modal ${wide ? 'wide' : ''}`}>
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description || 'Your Wellby patient portal'}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close">
              <X size={22} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <CheckCircle2 size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Status({ r }: { r: CareRequest }) {
  return (
    <span className={`status ${r.status}`}>
      <i />
      {
        {
          review: 'With the care team',
          awaiting_booking: 'Ready to book',
          booked: 'Appointment booked',
          urgent: 'Urgent guidance',
          closed: 'Completed',
        }[r.status]
      }
    </span>
  );
}
const initial: Intake = {
  symptoms: '',
  duration: '',
  severity: 'mild',
  age: 29,
  pregnant: false,
  conditions: 'None',
  medications: 'None',
  redFlags: [],
  goal: 'Advice and an appointment if needed',
  consent: false,
};
export default function App() {
  const [user, setUser] = useState<DemoUser | null>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);
  if (!ready)
    return (
      <div className="loading">
        <LoaderCircle className="spin" />
        Opening Wellby…
      </div>
    );
  if (!user) return <AuthScreen onAuth={setUser} />;
  if (!user.profile.complete) return <SetupScreen user={user} onDone={setUser} />;
  return (
    <Portal
      onLogout={async () => {
        await api('/auth/logout', {});
        setUser(null);
      }}
    />
  );
}
const isSharedPreview = !!document.querySelector('meta[name="wellby-guest-preview"]');
function Portal({ onLogout }: { onLogout: () => Promise<void> }) {
  const [state, setState] = useState<State | null>(null),
    [view, setView] = useState(() => {
      const v = location.hash.slice(1).split('/')[0];
      return [
        'home',
        'appointments',
        'requests',
        'departments',
        'urgent-care',
        'practice',
        'profile',
        'staff',
      ].includes(v) && !(isSharedPreview && v === 'staff')
        ? v
        : 'home';
    }),
    [flow, setFlow] = useState<{
      request?: CareRequest;
      replaceId?: string;
      example?: string;
      carePreference?: CarePreference;
    } | null>(null),
    [help, setHelp] = useState(false),
    [profile, setProfile] = useState(false),
    [details, setDetails] = useState<CareRequest | null>(null),
    [appointment, setAppointment] = useState<Appointment | null>(null),
    [error, setError] = useState(''),
    [mobile, setMobile] = useState(false),
    [urgentPostcode, setUrgentPostcode] = useState('');
  const refresh = async () => {
    try {
      setState(await api('/state'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void refresh();
    const i = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    const handler = () => {
      const v = location.hash.slice(1).split('/')[0];
      setView(
        [
          'home',
          'appointments',
          'requests',
          'departments',
          'urgent-care',
          'practice',
          'profile',
          'staff',
        ].includes(v) && !(isSharedPreview && v === 'staff')
          ? v
          : 'home',
      );
      setMobile(false);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  const go = (v: string) => {
    location.hash = v;
    setView(v);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const upcoming =
    state?.appointments.filter(
      (a) => a.status === 'confirmed' && a.slot.date >= new Date().toISOString().slice(0, 10),
    ) || [];
  return (
    <div className="app practice-portal">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="practice-masthead">
        <button className="brand-button" aria-label="Wellby home" onClick={() => go('home')}>
          <Logo />
        </button>
        <div className="masthead-practice">
          <strong>Willowbrook Medical Centre</strong>
          <span>
            Patient portal <small className="portal-demo-tag">Demo</small>
          </span>
        </div>
        <div className="masthead-account">
          <button onClick={() => go('requests')} aria-label="View care requests">
            <Bell size={20} />
            {!!state?.requests.some((r) => r.status === 'awaiting_booking') && <i />}
          </button>
          <button className="masthead-user" onClick={() => go('profile')}>
            <span>
              {state?.patient.photo ? (
                <img src={state.patient.photo} alt="Your profile" />
              ) : (
                state?.patient.initials || 'MP'
              )}
            </span>
            <div>
              <strong>{state?.patient.name || 'Patient account'}</strong>
              <small>My profile & details</small>
            </div>
            <ChevronDown size={14} />
          </button>
          <button
            className="mobile-menu-button"
            aria-label="Toggle navigation"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={23} />
          </button>
        </div>
      </header>
      <div className={'practice-navigation ' + (mobile ? 'expanded' : '')}>
        <nav aria-label="Main navigation">
          {[
            { id: 'home', label: 'Home' },
            { id: 'appointments', label: 'Appointments' },
            { id: 'requests', label: 'Care requests' },
            { id: 'departments', label: 'Care services' },
            { id: 'practice', label: 'Your practice' },
          ].map((n) => (
            <button
              key={n.id}
              className={view === n.id ? 'active' : ''}
              aria-current={view === n.id ? 'page' : undefined}
              onClick={() => go(n.id)}
            >
              {n.label}
              {n.id === 'appointments' && upcoming.length > 0 && <span>{upcoming.length}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="portal-main">
        <main className="page" id="main-content" tabIndex={-1}>
          <ErrorBox text={error} />
          {!state ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              Opening your patient portal…
            </div>
          ) : (
            <>
              {view === 'urgent-care' ? (
                <UrgentCare initialPostcode={urgentPostcode} onBack={() => go('home')} />
              ) : view === 'home' ? (
                <PracticeHome
                  state={state}
                  onStart={(example) => setFlow({ example })}
                  onView={go}
                  onAppointment={setAppointment}
                  onRequest={setDetails}
                />
              ) : view === 'appointments' ? (
                <>
                  <PageHeading
                    title="Your appointments"
                    subtitle="Everything you have coming up, all in one place."
                    action={
                      <Button onClick={() => setFlow({})}>
                        Find care
                        <Plus size={17} />
                      </Button>
                    }
                  />
                  <Appointments state={state} onOpen={setAppointment} />
                </>
              ) : view === 'requests' ? (
                <>
                  <PageHeading
                    title="Your care requests"
                    subtitle="Check the progress of a request or review an earlier conversation."
                    action={
                      <Button onClick={() => setFlow({})}>
                        New request
                        <Plus size={17} />
                      </Button>
                    }
                  />
                  <div className="request-list">
                    {state.requests.map((r) => (
                      <button className="request-row" key={r.id} onClick={() => setDetails(r)}>
                        <span className="request-icon">
                          <ClipboardList size={21} />
                        </span>
                        <div>
                          <strong>{r.decision.summary}</strong>
                          <small>
                            {formatDate(r.createdAt)} · {r.id}
                          </small>
                        </div>
                        <Status r={r} />
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                </>
              ) : view === 'departments' ? (
                <Departments
                  onStart={(example, carePreference) => setFlow({ example, carePreference })}
                />
              ) : view === 'practice' ? (
                <Practice state={state} onStart={() => setFlow({})} />
              ) : view === 'profile' ? (
                <>
                  <PageHeading
                    title="My profile"
                    subtitle="Check your contact details and the information shared with your practice."
                  />
                  <ProfileEditor patient={state.patient} onSaved={() => void refresh()} />
                </>
              ) : (
                <Staff state={state} refresh={refresh} />
              )}
              <footer className="footer">
                <div>
                  <Logo />
                  <span>Willowbrook Medical Centre · Patient services</span>
                </div>
                <div>
                  <button onClick={() => setHelp(true)}>Help & guidance</button>
                  {!isSharedPreview && (
                    <button onClick={() => go(view === 'staff' ? 'home' : 'staff')}>
                      {view === 'staff' ? 'Patient portal' : 'Practice workspace'}
                      <ArrowUpRight size={12} />
                    </button>
                  )}
                  <button onClick={() => void onLogout()}>Sign out</button>
                  <span>Fictional demonstration practice</span>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
      {state && (
        <SupportChat
          state={state}
          hidden={view === 'staff' || !!flow || !!appointment || !!details || help}
          onRefresh={refresh}
          onAppointments={() => go('appointments')}
          onUrgentCare={(postcode) => {
            setUrgentPostcode(postcode);
            go('urgent-care');
          }}
        />
      )}
      {state && flow && (
        <CareFlow
          state={state}
          initialRequest={flow.request}
          replaceId={flow.replaceId}
          example={flow.example}
          carePreference={flow.carePreference}
          onClose={() => setFlow(null)}
          refresh={refresh}
          onAppointments={() => {
            setFlow(null);
            go('appointments');
          }}
        />
      )}
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="A simpler way to find care."
        description="Tell us a little. We’ll help with the next step."
      >
        <div className="help-steps">
          {[
            [
              '01',
              'Tell us what’s going on',
              'Describe your symptoms in your own words. You don’t need to know what’s causing them.',
            ],
            [
              '02',
              'Find the right support',
              'Our care assistant suggests a suitable service. Requests that need a closer look go to the practice team.',
            ],
            [
              '03',
              'Choose a time that suits you',
              'Pick an available appointment and get your confirmation straight away.',
            ],
          ].map(([n, t, d]) => (
            <section key={n}>
              <b>{n}</b>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </section>
          ))}
        </div>
        <div className="notice">
          This is a fictional England practice portal. It is not a diagnosis or a real medical
          service. For real urgent advice, use{' '}
          <a href="https://111.nhs.uk/" target="_blank" rel="noreferrer">
            NHS 111
          </a>
          . In an emergency, call 999.
        </div>
      </Modal>
      {state && details && (
        <RequestProgress
          request={details}
          onClose={() => setDetails(null)}
          onBook={() => {
            setFlow({ request: details });
            setDetails(null);
          }}
          onAppointments={() => {
            setDetails(null);
            go('appointments');
          }}
        />
      )}
      {appointment && (
        <AppointmentDetail
          appointment={appointment}
          onClose={() => setAppointment(null)}
          onReschedule={() => {
            const r = state?.requests.find((r) => r.id === appointment.requestId);
            if (r) {
              setFlow({ request: r, replaceId: appointment.id });
              setAppointment(null);
            }
          }}
          refresh={refresh}
        />
      )}
    </div>
  );
}
function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function CareIllustration() {
  return (
    <div className="care-illustration" aria-hidden="true">
      <div className="illustration-orbit" />
      <div className="illustration-circle" />
      <svg className="plant" viewBox="0 0 180 240">
        <path d="M92 237C102 155 91 82 125 23" fill="none" stroke="#9db8ef" strokeWidth="3" />
        <path
          d="M103 160C47 156 28 119 41 89c46 4 64 32 62 71M99 117c5-51 39-83 71-69 3 40-28 65-71 69M108 81c-30-9-44-39-26-62 27 7 31 32 26 62M97 202c34-51 66-53 81-30-12 27-45 36-81 30"
          fill="#81a2e2"
        />
      </svg>
      <div className="care-tile">
        <Heart size={48} strokeWidth={1.4} />
        <span>
          Good care.
          <br />
          <strong>Closer to you.</strong>
        </span>
        <i>
          <Plus size={18} />
        </i>
      </div>
      <div className="small-tile">
        <ShieldCheck size={21} />
        <span>A clear next step</span>
        <Check size={13} />
      </div>
      <div className="star star-one">✳</div>
      <div className="star star-two">✦</div>
    </div>
  );
}
function Appointments({ state, onOpen }: { state: State; onOpen: (a: Appointment) => void }) {
  const [tab, setTab] = useState('upcoming');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const match = (a: Appointment, t: string) =>
    t === 'cancelled'
      ? a.status === 'cancelled'
      : a.status === 'confirmed' && (t === 'upcoming' ? a.slot.date >= today : a.slot.date < today);
  const rows = state.appointments
    .filter((a) => match(a, tab))
    .sort(
      (a, b) =>
        (a.slot.date + a.slot.time).localeCompare(b.slot.date + b.slot.time) *
        (tab === 'past' ? -1 : 1),
    );
  return (
    <>
      <div className="tabs appointment-tabs">
        {['upcoming', 'past', 'cancelled'].map((t) => (
          <button
            className={tab === t ? 'active' : ''}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            key={t}
          >
            {t[0].toUpperCase() + t.slice(1)}
            <span>{state.appointments.filter((a) => match(a, t)).length}</span>
          </button>
        ))}
      </div>
      {rows.length > 0 ? (
        <div className="appointment-ledger">
          <div className="appointment-ledger-heading">
            <span>
              {tab === 'upcoming'
                ? 'YOUR UPCOMING VISITS'
                : tab === 'past'
                  ? 'PREVIOUS APPOINTMENTS'
                  : 'CANCELLED VISITS'}
            </span>
            <span>All times shown in UK local time</span>
          </div>
          {rows.map((a, i) => (
            <button className="appointment-ledger-row" key={a.id} onClick={() => onOpen(a)}>
              <div className="appointment-date-stamp">
                <span>{formatDate(a.slot.date, { month: 'short' })}</span>
                <strong>{formatDate(a.slot.date, { day: 'numeric' })}</strong>
                <small>{formatDate(a.slot.date, { weekday: 'short' })}</small>
              </div>
              <div className="appointment-row-time">
                <strong>{a.slot.time}</strong>
                <span>{services[a.slot.route].duration} min</span>
                {tab === 'upcoming' && i === 0 && <small>Next visit</small>}
              </div>
              <div className="appointment-row-person">
                <Avatar c={a.clinician} />
                <div>
                  <strong>{a.clinician.name}</strong>
                  <span>{a.clinician.title}</span>
                  <p>{a.reason}</p>
                </div>
              </div>
              <div className="appointment-row-place">
                {a.slot.mode === 'Telephone' ? <Phone size={17} /> : <MapPin size={17} />}
                <span>
                  {a.slot.mode === 'Telephone' ? 'Telephone consultation' : a.clinician.location}
                  <small>
                    {a.status === 'cancelled'
                      ? 'Cancelled'
                      : tab === 'past'
                        ? 'Past visit'
                        : 'Confirmed'}
                  </small>
                </span>
              </div>
              <span className="appointment-row-open">
                Details
                <ChevronRight size={18} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty title={`No ${tab} appointments`}>
          Your appointments will appear here as you arrange your care.
        </Empty>
      )}
      <div className="appointment-ledger-note">
        <CalendarDays size={18} />
        <p>
          <strong>Plans changed?</strong> Open an appointment to choose a new time or cancel. Your
          current time stays booked until a change is confirmed.
        </p>
      </div>
    </>
  );
}
function AppointmentDetail({
  appointment: a,
  onClose,
  onReschedule,
  refresh,
}: {
  appointment: Appointment;
  onClose: () => void;
  onReschedule: () => void;
  refresh: () => Promise<void>;
}) {
  const [cancel, setCancel] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const doCancel = async () => {
    setBusy(true);
    try {
      await api(`/bookings/${a.id}/cancel`, {});
      await refresh();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Your appointment" description={a.id}>
      <ErrorBox text={error} />
      <div className="doctor-line appointment-doctor">
        <Avatar c={a.clinician} large />
        <div>
          <h2>{a.clinician.name}</h2>
          <p>{a.clinician.title}</p>
        </div>
      </div>
      <div className="booking-facts">
        <div>
          <CalendarDays size={20} />
          <span>
            <strong>{formatDate(a.slot.date)}</strong>
            <small>{a.slot.time} · UK time</small>
          </span>
        </div>
        <div>
          <MapPin size={20} />
          <span>
            <strong>
              {a.slot.mode === 'Telephone' ? 'Telephone appointment' : a.clinician.location}
            </strong>
            <small>
              {a.slot.mode === 'Telephone'
                ? 'The clinician would call your registered number.'
                : '22 Willow Lane, London · Fictional practice'}
            </small>
          </span>
        </div>
        <div>
          <FileText size={20} />
          <span>
            <strong>{a.reason}</strong>
            <small>
              {a.status === 'confirmed' ? 'Confirmed in this demo schedule' : 'Cancelled'}
            </small>
          </span>
        </div>
      </div>
      {a.funding === 'Private' && (
        <div className="care-visit-price">
          <span>
            Private consultation<small>Illustrative fee · no payment taken</small>
          </span>
          <strong>£{a.feeGbp}</strong>
        </div>
      )}
      <div className="appointment-preparation">
        <h3>Before your appointment</h3>
        <p>
          {a.slot.mode === 'Telephone'
            ? 'Check the telephone number in your profile and choose a quiet place for your call.'
            : 'Check the date and location above, and bring a list of anything you would like to discuss.'}
        </p>
      </div>
      <div className="notice">
        Demo booking only. No real clinician or NHS service has been booked.
      </div>
      {a.status === 'confirmed' && (
        <>
          <div className="modal-actions">
            <a className="button secondary" href={`/api/bookings/${a.id}/calendar`} download>
              <Download size={16} />
              Add to calendar
            </a>
            <Button onClick={onReschedule}>
              Change time
              <ArrowRight size={16} />
            </Button>
          </div>
          {cancel ? (
            <div className="cancel-confirm">
              <p>Cancel this appointment and release the time?</p>
              <Button secondary onClick={() => setCancel(false)}>
                Keep appointment
              </Button>
              <Button disabled={busy} onClick={() => void doCancel()}>
                Yes, cancel
              </Button>
            </div>
          ) : (
            <button className="cancel-link" onClick={() => setCancel(true)}>
              Cancel appointment
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
function Practice({ state, onStart }: { state: State; onStart: () => void }) {
  return (
    <>
      <PageHeading
        title="Your care team"
        subtitle="Find out who can help, and how to arrange an appointment."
      />
      <div className="practice-hero">
        <div>
          <span className="eyebrow">YOUR REGISTERED PRACTICE</span>
          <h2>{state.practice.name}</h2>
          <p>
            <MapPin size={16} />
            {state.practice.address}
          </p>
          <p>
            <Clock3 size={16} />
            {state.practice.hours}
          </p>
          <Button onClick={onStart}>
            Get help from the practice
            <ArrowRight size={16} />
          </Button>
        </div>
        <div className="practice-art" aria-hidden="true">
          <div className="building">
            <div className="building-cross">+</div>
            <div className="windows">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="door" />
          </div>
          <div className="tree tree-one" />
          <div className="tree tree-two" />
          <span>Willowbrook</span>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <h2>A team around you.</h2>
          <p>Different expertise. The same care for you.</p>
        </div>
        <span className="quiet">Fictional care team</span>
      </div>
      <div className="clinician-grid">
        {state.clinicians.map((c) => (
          <section className="clinician-card" key={c.id}>
            <Avatar c={c} large />
            <h3>{c.name}</h3>
            <span>{c.title}</span>
            <p>{c.bio}</p>
            <small>{c.languages.join(' · ')}</small>
            <button className="text-button" onClick={onStart}>
              Find the right appointment
              <ArrowUpRight size={15} />
            </button>
          </section>
        ))}
      </div>
      <div className="urgent-banner">
        <Phone size={23} />
        <div>
          <h3>Need help outside practice hours?</h3>
          <p>
            For real urgent medical advice, contact NHS 111. For a life-threatening emergency, call
            999.
          </p>
        </div>
        <a href="https://111.nhs.uk/" target="_blank" rel="noreferrer">
          Visit NHS 111
          <ArrowUpRight size={16} />
        </a>
      </div>
    </>
  );
}
function Staff({ state, refresh }: { state: State; refresh: () => Promise<void> }) {
  const [tab, setTab] = useState(() => {
      const t = location.hash.split('/')[1];
      return ['inbox', 'schedule', 'comparison', 'urgent-care', 'learning'].includes(t)
        ? t
        : 'inbox';
    }),
    [selected, setSelected] = useState<CareRequest | null>(null),
    [route, setRoute] = useState<Route>('gp'),
    [notes, setNotes] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [count, setCount] = useState(25),
    [history, setHistory] = useState<HistoricalCase[]>([]),
    [q, setQ] = useState('');
  useEffect(() => {
    if (tab === 'learning')
      void api<HistoricalCase[]>('/staff/history')
        .then(setHistory)
        .catch((e) => setError(e.message));
  }, [tab]);
  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api('/staff/requests/' + selected.id, { route, notes }, 'PATCH');
      setSelected(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const batch = async (kind: 'training' | 'evaluation') => {
    setBusy(true);
    setError('');
    try {
      await api('/staff/batch', { kind, count: kind === 'evaluation' ? 20 : count });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const update = () => {
      const t = location.hash.split('/')[1];
      setTab(
        ['inbox', 'schedule', 'comparison', 'urgent-care', 'learning'].includes(t) ? t : 'inbox',
      );
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const active = state.training.jobs.find((j) => j.status === 'running');
  return (
    <>
      <PageHeading
        title="Practice workspace"
        subtitle="Review care requests, manage appointments and measure service quality."
      />
      <div className="tabs">
        {[
          ['inbox', 'Care inbox'],
          ['schedule', 'Practice schedule'],
          ['comparison', 'Model comparison'],
          ['urgent-care', 'Urgent care'],
          ['learning', 'Settings & learning'],
        ].map(([id, l]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => {
              setTab(id);
              location.hash = 'staff/' + id;
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <ErrorBox text={error} />
      {tab === 'inbox' ? (
        <>
          <div className="staff-metrics">
            {[
              ['Needs a review', state.requests.filter((r) => r.status === 'review').length],
              [
                'Ready to book',
                state.requests.filter((r) => r.status === 'awaiting_booking').length,
              ],
              [
                'Appointments booked',
                state.appointments.filter((a) => a.status === 'confirmed').length,
              ],
            ].map(([l, n]) => (
              <div key={l}>
                <span>{l}</span>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <div className="staff-list">
            <div className="staff-list-heading">
              <h2>Patient requests</h2>
              <label>
                <Search size={16} />
                <input
                  placeholder="Search requests…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
            </div>
            {state.requests
              .filter((r) =>
                [r.decision.summary, r.id, r.status]
                  .join(' ')
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              )
              .map((r) => (
                <button
                  className="request-row"
                  key={r.id}
                  onClick={() => {
                    setSelected(r);
                    setRoute(r.decision.route);
                    setNotes(r.notes);
                    setError('');
                  }}
                >
                  <span className="patient-mini">{state.patient.initials}</span>
                  <div>
                    <strong>
                      {state.patient.name} <small>· {r.id}</small>
                    </strong>
                    <p>{r.decision.summary}</p>
                  </div>
                  <Status r={r} />
                  <ChevronRight size={18} />
                </button>
              ))}
          </div>
          <div className="notice">
            This is a local demo workspace, not an authenticated clinical system. The inbox shows
            requests for the current demo account.
          </div>
        </>
      ) : tab === 'schedule' ? (
        <div className="staff-list">
          <div className="staff-list-heading">
            <h2>Confirmed appointments</h2>
            <span>Fictional practice schedule</span>
          </div>
          {state.appointments
            .filter((a) => a.status === 'confirmed')
            .map((a) => (
              <div className="schedule-row" key={a.id}>
                <span>
                  <strong>{a.slot.time}</strong>
                  <small>{formatDate(a.slot.date, { day: 'numeric', month: 'short' })}</small>
                </span>
                <Avatar c={a.clinician} />
                <div>
                  <strong>{a.clinician.name}</strong>
                  <p>
                    {state.patient.name} · {a.reason}
                  </p>
                </div>
                <span className="status">{a.slot.mode}</span>
              </div>
            ))}
        </div>
      ) : tab === 'urgent-care' ? (
        <UrgentCareWorkspace />
      ) : tab === 'comparison' ? (
        <Comparison />
      ) : (
        <>
          <div className="settings-grid">
            <section className="settings-card">
              <span className="eyebrow">MUBIT · SPECIALIST LEARNING</span>
              <h2>Learn a repeatable care task.</h2>
              <p>
                Record model answers to historical-style requests. Mubit groups this task, reviews
                examples and can train a specialist adapter.
              </p>
              <div className="training-number">
                <strong>
                  {state.training.recorded}
                  <small>/ {state.training.available}</small>
                </strong>
                <span>
                  responses recorded
                  <br />
                  Synthetic examples, not clinical records
                </span>
              </div>
              <div className="batch-actions">
                <select
                  aria-label="Training batch size"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {[1, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} examples
                    </option>
                  ))}
                </select>
                <Button
                  disabled={
                    busy ||
                    !!active ||
                    !state.configured ||
                    state.training.recorded >= state.training.available
                  }
                  onClick={() => void batch('training')}
                >
                  Record examples
                  <ArrowRight size={16} />
                </Button>
              </div>
              <p className="small-print">
                Real Haiku calls through Mubit. Usage charges apply. Synthetic expected routes are
                excluded from the prompt.
              </p>
              {state.training.jobs.slice(0, 3).map((j) => (
                <div className="training-job" key={j.id}>
                  <div>
                    <strong>
                      {j.completed} of {j.count} completed
                    </strong>
                    <span>{j.status}</span>
                    {j.status === 'running' && (
                      <button
                        onClick={async () => {
                          await api('/staff/batch/' + j.id + '/stop', {});
                          await refresh();
                        }}
                      >
                        Stop
                      </button>
                    )}
                  </div>
                  <progress value={j.completed + j.errors} max={j.count} />
                  <small>{j.errors} errors</small>
                  {j.error && <ErrorBox text={j.error} />}
                </div>
              ))}
            </section>
            <section className="settings-card">
              <h2>Connection & training</h2>
              <dl className="settings-facts">
                <div>
                  <dt>Model</dt>
                  <dd>Claude Haiku 4.5</dd>
                </div>
                <div>
                  <dt>Gateway</dt>
                  <dd>{state.configured ? 'Mubit configured' : 'API key required'}</dd>
                </div>
                <div>
                  <dt>Task</dt>
                  <dd>{state.training.taskName}</dd>
                </div>
                <div>
                  <dt>Accepted examples</dt>
                  <dd>{state.training.consoleSnapshot?.kept ?? 'Not verified'}</dd>
                </div>
                <div>
                  <dt>Training</dt>
                  <dd>{state.training.consoleSnapshot?.training ?? 'Verify in Mubit'}</dd>
                </div>
                <div>
                  <dt>Serving</dt>
                  <dd>{state.training.consoleSnapshot?.serving ?? 'Not verified'}</dd>
                </div>
              </dl>
              <a
                className="button secondary"
                href={state.training.consoleUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open Wellby task
                <ExternalLink size={15} />
              </a>
              {state.training.consoleSnapshot && (
                <p className="small-print">
                  Manually verified{' '}
                  {new Date(state.training.consoleSnapshot.checkedAt).toLocaleString('en-GB', {
                    timeZone: 'Europe/London',
                  })}{' '}
                  UK time.{' '}
                  {state.training.consoleSnapshot.waiting === null
                    ? 'Pending-review count was not reported.'
                    : `${state.training.consoleSnapshot.waiting} calls awaiting Mubit review, including retry attempts.`}{' '}
                  This is a dated snapshot, not a live status feed.
                </p>
              )}
              <div className="notice">
                Recorded calls do not prove training. Confirm kept examples, a passing adapter and
                serving status in Mubit. Patient content is excluded from training. Staff edits are
                saved locally; they do not retrain a model.
              </div>
            </section>
            <section className="settings-card">
              <h2>Check unseen examples</h2>
              <p>
                20 separate fictional scenarios are excluded from recording. Compare suggested
                routes with illustrative labels.
              </p>
              <div className="evaluation-numbers">
                <div>
                  <strong>{state.evaluation.count}/20</strong>
                  <span>Reviewed</span>
                </div>
                <div>
                  <strong>
                    {state.evaluation.count
                      ? Math.round((state.evaluation.matched / state.evaluation.count) * 100) + '%'
                      : '—'}
                  </strong>
                  <span>Label agreement</span>
                </div>
                <div>
                  <strong>
                    {state.evaluation.meanLatencyMs
                      ? (state.evaluation.meanLatencyMs / 1000).toFixed(1) + 's'
                      : '—'}
                  </strong>
                  <span>Average response</span>
                </div>
              </div>
              <Button
                secondary
                disabled={busy || !!active || state.evaluation.count >= 20 || !state.configured}
                onClick={() => void batch('evaluation')}
              >
                Evaluate reserved cases
                <ArrowRight size={15} />
              </Button>
              <p className="small-print">
                Illustrative demo comparison, not clinical validation or proof of adapter
                improvement.
              </p>
            </section>
            <section className="settings-card">
              <h2>Dataset & workflow</h2>
              <p>
                {state.training.available + 20} synthetic navigation scenarios across minor
                conditions, planned care, musculoskeletal concerns and escalation. No real patient
                records.
              </p>
              <div className="source-links">
                <a href="/api/staff/history" target="_blank">
                  View all fictional cases
                  <ArrowUpRight size={15} />
                </a>
                <a href="/api/staff/receipts" download>
                  Download Mubit receipts
                  <Download size={15} />
                </a>
                <a
                  href="https://docs.mubit.ai/guides/first-adapter"
                  target="_blank"
                  rel="noreferrer"
                >
                  How adapter training works
                  <ArrowUpRight size={15} />
                </a>
                <a
                  href="https://www.england.nhs.uk/primary-care/pharmacy/pharmacy-services/pharmacy-first/"
                  target="_blank"
                  rel="noreferrer"
                >
                  NHS Pharmacy First pathways
                  <ArrowUpRight size={15} />
                </a>
              </div>
              <details>
                <summary>Dataset preview</summary>
                {history.slice(0, 5).map((h) => (
                  <p className="history-example" key={h.id}>
                    <strong>
                      {h.id} · {h.topic}
                    </strong>
                    {h.input.symptoms}
                  </p>
                ))}
              </details>
            </section>
          </div>
        </>
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Review care request"
        description={selected?.id}
      >
        {selected && (
          <>
            <Status r={selected} />
            <h2 className="detail-title">{state.patient.name}</h2>
            <div className="quote">{selected.input.symptoms}</div>
            <p className="detail-copy">{selected.decision.reason}</p>
            <label className="field-label">
              Care pathway
              <select value={route} onChange={(e) => setRoute(e.target.value as Route)}>
                {Object.entries(services).map(([r, s]) => (
                  <option value={r} key={r}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Review notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the next step for the patient…"
                maxLength={2000}
              />
            </label>
            <ErrorBox text={error} />
            <div className="modal-actions">
              <Button
                disabled={busy || notes.length < 5 || selected.status === 'booked'}
                onClick={() => void save()}
              >
                Save review
                <Check size={17} />
              </Button>
            </div>
            {selected.status === 'booked' && (
              <p className="small-print">
                Cancel the existing appointment before changing its pathway.
              </p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
function UserRoundIcon() {
  return <Users size={18} />;
}
