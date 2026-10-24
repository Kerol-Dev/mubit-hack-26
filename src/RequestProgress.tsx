import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  ShieldCheck,
  X,
  CalendarDays,
  MessageCircle,
} from 'lucide-react';
import { services, type CareRequest } from '../shared/types';
const when = (value: string) =>
  new Date(value).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
export function RequestProgress({
  request: r,
  onClose,
  onBook,
  onAppointments,
}: {
  request: CareRequest;
  onClose: () => void;
  onBook: () => void;
  onAppointments: () => void;
}) {
  const pending = r.status === 'review',
    urgent = r.status === 'urgent',
    booked = r.status === 'booked';
  const title = urgent
    ? 'Please get help now'
    : pending
      ? 'Your request is with the practice team'
      : booked
        ? 'Your appointment is arranged'
        : r.status === 'closed'
          ? 'This request is complete'
          : 'Your next step is ready';
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="journey-overlay" />
        <Dialog.Content className="care-record">
          <header className="care-record-header">
            <div>
              <span>YOUR CARE REQUEST</span>
              <Dialog.Description>
                {r.id} · {when(r.createdAt)}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close care request">
              <X size={21} />
            </Dialog.Close>
          </header>
          <div className="care-record-body">
            <div className={'care-record-status ' + (urgent ? 'urgent' : '')}>
              <span>
                {urgent ? (
                  <ShieldCheck size={23} />
                ) : pending ? (
                  <Clock3 size={23} />
                ) : (
                  <Check size={23} />
                )}
              </span>
              <div>
                <small>
                  {pending
                    ? 'AWAITING REVIEW'
                    : urgent
                      ? 'URGENT GUIDANCE'
                      : booked
                        ? 'BOOKED'
                        : 'UPDATE'}
                </small>
                <Dialog.Title>{title}</Dialog.Title>
              </div>
            </div>
            <div className="care-record-track" aria-label="Request progress">
              <div className="done">
                <span>
                  <Check size={14} />
                </span>
                <strong>Request received</strong>
              </div>
              <div className={pending ? 'current' : 'done'}>
                <span>{pending ? <Clock3 size={14} /> : <Check size={14} />}</span>
                <strong>{pending ? 'Team review' : 'Care guidance'}</strong>
              </div>
              {!urgent && (
                <div
                  className={
                    booked || r.status === 'closed'
                      ? 'done'
                      : r.status === 'awaiting_booking'
                        ? 'current'
                        : ''
                  }
                >
                  <span>{booked ? <Check size={14} /> : <CalendarDays size={14} />}</span>
                  <strong>
                    {booked
                      ? 'Appointment booked'
                      : r.status === 'closed'
                        ? 'Request closed'
                        : 'Arrange care'}
                  </strong>
                </div>
              )}
            </div>
            <section className="care-record-next">
              <span>YOUR NEXT STEP</span>
              <h3>{services[r.decision.route].name}</h3>
              <p>{r.notes || r.decision.nextStep}</p>
              {pending && (
                <small>
                  You can check this request here for updates. No appointment has been booked yet.
                </small>
              )}
              {r.status === 'awaiting_booking' && (
                <button onClick={onBook}>
                  Choose an appointment
                  <ArrowRight size={17} />
                </button>
              )}
              {booked && (
                <button onClick={onAppointments}>
                  View your appointment
                  <ArrowRight size={17} />
                </button>
              )}
            </section>
            {urgent && (
              <div className="care-record-urgent" role="alert">
                {r.decision.route === 'emergency'
                  ? 'Call 999 now. Do not wait for an online response.'
                  : 'Contact NHS 111 now, or your practice for same-day help. Do not wait for a routine appointment.'}
              </div>
            )}
            <details className="care-record-description">
              <summary>
                <FileText size={16} />
                What you told us
              </summary>
              <p>{r.input.symptoms}</p>
              <dl>
                <div>
                  <dt>Duration</dt>
                  <dd>{r.input.duration}</dd>
                </div>
                <div>
                  <dt>Impact</dt>
                  <dd>{r.input.severity}</dd>
                </div>
              </dl>
            </details>
            <details className="care-record-history">
              <summary>
                <MessageCircle size={16} />
                Request activity
              </summary>
              <ol>
                {r.history.map((h, i) => (
                  <li key={i}>
                    <span />
                    <div>
                      <strong>{h.text}</strong>
                      <time dateTime={h.at}>{when(h.at)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
            <p className="care-record-disclaimer">
              Fictional care request. This portal does not provide a diagnosis or real medical care.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
