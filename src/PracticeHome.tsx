import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Stethoscope,
} from 'lucide-react';
import { services, type State, type Appointment, type CareRequest } from '../shared/types';
const date = (s: string, options: Intl.DateTimeFormatOptions) =>
  new Date(s.length === 10 ? s + 'T12:00:00Z' : s).toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    ...options,
  });
const status = (r: CareRequest) =>
  ({
    review: 'With your care team',
    awaiting_booking: 'Ready to book',
    booked: 'Booked',
    urgent: 'Urgent guidance',
    closed: 'Complete',
  })[r.status];
export function PracticeHome({
  state,
  onStart,
  onView,
  onAppointment,
  onRequest,
}: {
  state: State;
  onStart: (example?: string) => void;
  onView: (view: string) => void;
  onAppointment: (a: Appointment) => void;
  onRequest: (r: CareRequest) => void;
}) {
  const now = new Date(),
    hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(now),
    );
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const next = [...state.appointments]
    .filter((a) => a.status === 'confirmed' && a.slot.date >= today)
    .sort((a, b) => (a.slot.date + a.slot.time).localeCompare(b.slot.date + b.slot.time))[0];
  const active = state.requests.filter((r) =>
    ['awaiting_booking', 'review', 'urgent'].includes(r.status),
  );
  return (
    <div className="simple-home">
      <div className="simple-welcome">
        <div>
          <h1>
            {hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'},{' '}
            {state.patient.firstName}.
          </h1>
          <p>Your care, all in one place.</p>
        </div>
        <span>{date(now.toISOString(), { weekday: 'short', day: 'numeric', month: 'long' })}</span>
      </div>
      <div className="simple-priorities">
        <section className="simple-start">
          <span className="simple-icon">
            <Stethoscope size={24} />
          </span>
          <div>
            <h2>How can we help?</h2>
            <p>
              Tell us what’s happening.
              <br />
              We’ll help you find your next step.
            </p>
          </div>
          <button onClick={() => onStart()}>
            Request care
            <ArrowRight size={20} />
          </button>
        </section>
        <section className="simple-appointment">
          <header>
            <span>Next appointment</span>
            <button onClick={() => onView('appointments')}>
              View all
              <ArrowUpRight size={15} />
            </button>
          </header>
          {next ? (
            <>
              <div className="simple-visit">
                <div className="simple-date">
                  <span>{date(next.slot.date, { month: 'short' })}</span>
                  <strong>{date(next.slot.date, { day: 'numeric' })}</strong>
                </div>
                <div>
                  <h2>
                    {date(next.slot.date, { weekday: 'long' })}, {next.slot.time}
                  </h2>
                  <p>{next.clinician.name}</p>
                  <span>
                    {next.slot.mode} · {services[next.slot.route].duration} min
                  </span>
                </div>
              </div>
              <button className="simple-visit-action" onClick={() => onAppointment(next)}>
                Manage appointment
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <div className="simple-no-visit">
              <CalendarDays size={28} />
              <h2>No upcoming appointments</h2>
              <p>Start a care request when you need us.</p>
            </div>
          )}
        </section>
      </div>
      <section className="simple-requests">
        <header>
          <h2>Your requests{active.length > 0 && <span>{active.length}</span>}</h2>
          <button onClick={() => onView('requests')}>
            View history
            <ArrowUpRight size={15} />
          </button>
        </header>
        {active.length ? (
          <div className="simple-request-list">
            {active.slice(0, 3).map((r) => (
              <button key={r.id} className="simple-request" onClick={() => onRequest(r)}>
                <span className={'simple-request-symbol ' + r.status}>
                  <Clock3 size={20} />
                </span>
                <div>
                  <strong>{services[r.decision.route].label}</strong>
                  <p>{r.input.symptoms}</p>
                </div>
                <span className={'simple-status ' + r.status}>{status(r)}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        ) : (
          <div className="simple-up-to-date">
            <span>You’re up to date.</span>
            <p>No requests need your attention.</p>
          </div>
        )}
      </section>
      <div className="simple-support">
        <button onClick={() => onView('departments')}>
          Explore our services
          <ArrowRight size={16} />
        </button>
        <button onClick={() => onView('practice')}>
          Your practice & care team
          <ArrowRight size={16} />
        </button>
        <a href="https://111.nhs.uk/" target="_blank" rel="noreferrer">
          Urgent help
          <ArrowUpRight size={15} />
        </a>
      </div>
    </div>
  );
}
