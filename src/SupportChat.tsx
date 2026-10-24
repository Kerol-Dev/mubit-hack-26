import { useEffect, useRef, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  MessageCircle,
  Send,
  X,
} from 'lucide-react';
import { services, type State, type Slot } from '../shared/types';
import type { SupportConversation, SupportMessage } from '../shared/support-chat';
import './support-chat.css';

const day = (date: string) =>
  new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
async function call(path: string, body?: unknown) {
  const r = await fetch('/api' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(Error(data.error || 'Please try again.'), { data });
  return data;
}
export function SupportChat({
  state,
  hidden,
  onRefresh,
  onAppointments,
}: {
  state: State;
  hidden: boolean;
  onRefresh: () => Promise<void>;
  onAppointments: () => void;
}) {
  const [open, setOpen] = useState(false),
    [conversation, setConversation] = useState<SupportConversation>({
      messages: [],
      configured: state.configured,
    }),
    [loaded, setLoaded] = useState(false),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  const input = useRef<HTMLTextAreaElement>(null),
    end = useRef<HTMLDivElement>(null),
    launcher = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    setBusy('Loading your conversation');
    call('/support-chat')
      .then((d) => {
        if (!cancelled) {
          setConversation(d);
          setLoaded(true);
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setBusy(''));
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);
  useEffect(() => {
    if (open && loaded) input.current?.focus();
  }, [open, loaded]);
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open, conversation.messages.length, busy]);
  const action = async (path: string, body: unknown, label: string) => {
    if (busy) return;
    setBusy(label);
    setError('');
    try {
      setConversation(await call(path, body));
      if (path !== '/support-chat/message') await onRefresh();
    } catch (e) {
      const err = e as Error & { data?: SupportConversation };
      if (err.data?.messages) setConversation((c) => ({ ...c, messages: err.data!.messages }));
      setError(err.message);
    } finally {
      setBusy('');
      setTimeout(() => input.current?.focus(), 0);
    }
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setText('');
    void action(
      '/support-chat/message',
      { text: value, id: crypto.randomUUID() },
      'Writing a reply',
    );
  };
  const seed = (value: string) => {
    setText(value);
    input.current?.focus();
  };
  const viewAppointments = () => {
    setOpen(false);
    onAppointments();
  };
  return (
    <Dialog.Root modal={false} open={open && !hidden} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          ref={launcher}
          className="care-chat-launcher"
          style={hidden ? { display: 'none' } : undefined}
          aria-label="Open Wellby care assistant"
        >
          <MessageCircle size={21} />
          <span>Ask Wellby</span>
          <span className="care-chat-launcher-dot" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          className="care-chat"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            input.current?.focus();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            launcher.current?.focus();
          }}
        >
          <header className="care-chat-header">
            <span className="care-chat-mark">
              w<span>·</span>
            </span>
            <div>
              <Dialog.Title>Here to help</Dialog.Title>
              <Dialog.Description>Your Wellby care assistant</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Minimise chat">
              <X size={20} />
            </Dialog.Close>
          </header>
          <div className="care-chat-notice">
            <strong>Not medical advice</strong>
            <span>General information · Demo appointments</span>
          </div>
          <div
            className="care-chat-thread"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!conversation.messages.length && (
              <div className="care-chat-welcome">
                <span className="care-chat-welcome-icon">
                  <MessageCircle size={25} />
                </span>
                <h3>
                  A little help,
                  <br />a clearer next step.
                </h3>
                <p>
                  Ask a health question or tell me what’s troubling you. We can find care and a time
                  that suits you.
                </p>
                <div className="care-chat-starters">
                  <button onClick={() => seed('I’d like help with some symptoms.')}>
                    <span>Help with symptoms</span>
                    <ArrowUpRight size={16} />
                  </button>
                  <button onClick={() => seed('I have a general health question: ')}>
                    <span>Ask a health question</span>
                    <ArrowUpRight size={16} />
                  </button>
                  <button onClick={viewAppointments}>
                    <span>My appointments</span>
                    <CalendarDays size={16} />
                  </button>
                </div>
              </div>
            )}
            {conversation.messages.map((m, index) => {
              const lastForRequest = !conversation.messages
                .slice(index + 1)
                .some((n) => n.requestId && n.requestId === m.requestId);
              return (
                <div className={'care-chat-message ' + m.role} key={m.id}>
                  {m.role === 'assistant' && <span className="care-chat-speaker">Wellby</span>}
                  <p>{m.text}</p>
                  {m.draft &&
                    !m.requestId &&
                    !conversation.messages.slice(index + 1).some((n) => n.role === 'user') && (
                      <div className="care-chat-summary">
                        <span className="care-chat-kicker">Your care summary</span>
                        <strong>{m.draft.symptoms}</strong>
                        <small>
                          {m.draft.duration} · {m.draft.severity} symptoms
                        </small>
                        <details>
                          <summary>
                            Check details
                            <ChevronDown size={14} />
                          </summary>
                          <dl>
                            <div>
                              <dt>Age</dt>
                              <dd>{m.draft.age}</dd>
                            </div>
                            <div>
                              <dt>Conditions</dt>
                              <dd>{m.draft.conditions || 'None reported'}</dd>
                            </div>
                            <div>
                              <dt>Medicines</dt>
                              <dd>{m.draft.medications || 'None reported'}</dd>
                            </div>
                            <div>
                              <dt>Pregnancy</dt>
                              <dd>{m.draft.pregnant ? 'Yes' : 'Not reported'}</dd>
                            </div>
                            <div>
                              <dt>Emergency symptoms</dt>
                              <dd>{m.draft.redFlags.join(', ') || 'None reported'}</dd>
                            </div>
                          </dl>
                          <small>
                            Something wrong? Tell me in your next message before continuing.
                          </small>
                        </details>
                        <button
                          className="care-chat-primary"
                          disabled={!!busy}
                          onClick={() =>
                            void action(
                              '/support-chat/route',
                              { messageId: m.id },
                              'Finding suitable care',
                            )
                          }
                        >
                          Find suitable care
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  {m.request && lastForRequest && (
                    <CareCard
                      message={m}
                      state={state}
                      busy={!!busy}
                      onBook={(slotId) =>
                        void action(
                          '/support-chat/book',
                          { messageId: m.id, slotId },
                          'Confirming your appointment',
                        )
                      }
                      onAppointments={viewAppointments}
                    />
                  )}
                </div>
              );
            })}
            {!!busy && (
              <div className="care-chat-pending" role="status">
                <LoaderCircle size={15} className="spin" />
                {busy}…
              </div>
            )}
            <div ref={end} />
          </div>
          {error && (
            <div className="care-chat-error" role="alert">
              {error}
              {!loaded && (
                <button
                  onClick={() => {
                    setOpen(false);
                    setTimeout(() => setOpen(true), 0);
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          )}
          <form className="care-chat-compose" onSubmit={send}>
            <label className="care-chat-sr" htmlFor="care-chat-input">
              Message Wellby
            </label>
            <textarea
              id="care-chat-input"
              ref={input}
              rows={2}
              maxLength={2000}
              value={text}
              disabled={!loaded || !conversation.configured}
              placeholder="How can I help?"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(e);
                }
              }}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!!busy || !text.trim() || !loaded || !conversation.configured}
            >
              <Send size={18} />
            </button>
          </form>
          <footer className="care-chat-footer">
            For an emergency, call <a href="tel:999">999</a>. Don’t wait for chat.
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function CareCard({
  message,
  state,
  busy,
  onBook,
  onAppointments,
}: {
  message: SupportMessage;
  state: State;
  busy: boolean;
  onBook: (id: string) => void;
  onAppointments: () => void;
}) {
  const request = message.request!,
    appointment =
      state.appointments.find((a) => a.requestId === request.id && a.status === 'confirmed') ||
      message.appointment;
  const [slots, setSlots] = useState<Slot[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<Slot | null>(null),
    [more, setMore] = useState(false),
    [version, setVersion] = useState(0);
  const live = state.requests.find((r) => r.id === request.id) || request;
  useEffect(() => {
    if (live.status !== 'awaiting_booking') return;
    let cancelled = false;
    setLoading(true);
    setError('');
    call('/slots?requestId=' + encodeURIComponent(request.id))
      .then((d) => {
        if (!cancelled) {
          setSlots(d);
          setSelected(null);
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [request.id, live.status, version]);
  if (appointment?.status === 'confirmed')
    return (
      <div className="care-chat-booked">
        <CheckCircle2 size={25} />
        <span className="care-chat-kicker">Appointment confirmed</span>
        <h4>
          {day(appointment.slot.date)} · {appointment.slot.time}
        </h4>
        <p>
          {appointment.clinician.name}
          <br />
          {appointment.slot.mode} · {appointment.clinician.location}
        </p>
        <small>Demo booking · {appointment.id}</small>
        <button onClick={onAppointments}>
          View appointment
          <ArrowRight size={15} />
        </button>
      </div>
    );
  const service = services[live.decision.route];
  return (
    <div className={'care-chat-route ' + (live.status === 'urgent' ? 'urgent' : '')}>
      <span className="care-chat-kicker">Your next step</span>
      <h4>{service.label}</h4>
      <p>{live.decision.reason}</p>
      {live.status === 'awaiting_booking' ? (
        <>
          <div className="care-chat-slots-heading">
            <strong>Choose a time</strong>
            <small>UK time · Demo</small>
          </div>
          {loading ? (
            <small role="status">Checking available times…</small>
          ) : error ? (
            <div role="alert">
              {error}
              <button onClick={() => setVersion((v) => v + 1)}>Refresh times</button>
            </div>
          ) : !slots.length ? (
            <p>No available times. Please contact the practice.</p>
          ) : (
            <>
              <div className="care-chat-slots">
                {slots.slice(0, more ? 12 : 3).map((s) => (
                  <button
                    key={s.id}
                    className={selected?.id === s.id ? 'selected' : ''}
                    aria-pressed={selected?.id === s.id}
                    disabled={busy}
                    onClick={() => setSelected(s)}
                  >
                    <span>
                      <strong>
                        {day(s.date)} · {s.time}
                      </strong>
                      <small>
                        {state.clinicians.find((c) => c.id === s.clinicianId)?.name} · {s.mode}
                      </small>
                    </span>
                    {selected?.id === s.id ? <Check size={16} /> : <ArrowRight size={15} />}
                  </button>
                ))}
              </div>
              {slots.length > 3 && (
                <button className="care-chat-more" onClick={() => setMore(!more)}>
                  {more ? 'Fewer times' : 'More available times'}
                  <ChevronDown size={14} />
                </button>
              )}
              {selected && (
                <button
                  className="care-chat-primary"
                  disabled={busy}
                  onClick={() => onBook(selected.id)}
                >
                  Confirm {selected.time} appointment
                  <Check size={16} />
                </button>
              )}
              <button
                className="care-chat-more"
                disabled={busy}
                onClick={() => setVersion((v) => v + 1)}
              >
                Refresh availability
              </button>
            </>
          )}
        </>
      ) : (
        <p className="care-chat-safety">{live.decision.nextStep}</p>
      )}
      <details className="care-chat-safety-details">
        <summary>When to get more help</summary>
        <p>{live.decision.safetyNet}</p>
      </details>
    </div>
  );
}
