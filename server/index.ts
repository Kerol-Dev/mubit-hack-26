import { installUrgentWorkspace } from './urgent-workspace';
import { installUrgentWait } from './urgent-wait';
import {
  preferenceSchema,
  applyCarePreference,
  clinicianFunding,
  consultationFee,
} from './care-options';
import type { CarePreference } from '../shared/departments';
import { installSupportChat } from './support-chat';
import { expandedTraining } from './training-expansion';
import { training500 } from './training-500';
import { installBenchmark } from './benchmark';
import { installEndpointComparison } from './endpoint-comparison';
import 'dotenv/config';
import { installAuth } from './auth';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { clinicians, patient, practice, history } from './data';
import {
  navigate,
  navigatePatientRequest,
  intakeSchema,
  taskName,
  instructions,
} from './navigation';
import { services } from '../shared/types';
import type {
  CareRequest,
  Booking,
  Slot,
  Appointment,
  TrainingJob,
  Decision,
  Route,
  Intake,
} from '../shared/types';
mkdirSync('.wellby', { recursive: true });
const db = new DatabaseSync('.wellby/practice.sqlite');
db.exec(
  `PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,data TEXT,PRIMARY KEY(kind,id));CREATE TABLE IF NOT EXISTS slots(id TEXT PRIMARY KEY,data TEXT);CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,slot_id TEXT,request_id TEXT,status TEXT,data TEXT);CREATE UNIQUE INDEX IF NOT EXISTS reserved_slot ON bookings(slot_id) WHERE status='confirmed';CREATE UNIQUE INDEX IF NOT EXISTS request_booking ON bookings(request_id) WHERE status='confirmed';`,
);
const read = <T>(kind: string): T[] =>
  db
    .prepare('SELECT data FROM records WHERE kind=?')
    .all(kind)
    .map((r) => JSON.parse(String(r.data)));
const get = <T>(kind: string, id: string): T | undefined => {
  const r = db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind, id);
  return r ? JSON.parse(String(r.data)) : undefined;
};
const put = <T extends { id: string }>(kind: string, obj: T) =>
  db.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(kind, obj.id, JSON.stringify(obj));
for (const j of read<TrainingJob>('job').filter(
  (j) => j.status === 'running' && !(j as TrainingJob & { dataset?: string }).dataset,
))
  put('job', {
    ...j,
    status: 'partial',
    error: 'Server restarted. Completed examples are preserved.',
  });
const londonDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
export function slotInstant(s: Slot) {
  const guess = new Date(`${s.date}T${s.time}:00Z`);
  const name = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(guess)
    .find((p) => p.type === 'timeZoneName')?.value;
  return new Date(guess.getTime() - (name === 'GMT+1' ? 3600000 : 0));
}
for (let day = 1; day <= 28; day++) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + day);
  const date = londonDate(d),
    weekday = new Date(date + 'T12:00:00Z').getUTCDay();
  for (const c of clinicians) {
    if (weekday === 0 || (weekday === 6 && c.role !== 'pharmacy')) continue;
    const times =
      c.role === 'pharmacy'
        ? ['09:15', '10:00', '11:30', '14:15', '16:00']
        : c.id === 'amara'
          ? ['09:00', '09:40', '11:20', '14:00', '15:40']
          : c.id === 'james'
            ? ['10:00', '11:00', '13:40', '15:00']
            : ['09:30', '10:30', '13:30', '15:30'];
    for (let n = 0; n < times.length; n++) {
      if ((day + n + c.id.length) % 5 === 0) continue;
      const s: Slot = {
        id: `${c.id}-${date}-${times[n]}`,
        date,
        time: times[n],
        clinicianId: c.id,
        route: c.role,
        mode: n === 1 && c.role === 'gp' ? 'Telephone' : 'In person',
      };
      db.prepare('INSERT OR IGNORE INTO slots VALUES(?,?)').run(s.id, JSON.stringify(s));
    }
  }
}
const allSlots = () =>
  db
    .prepare('SELECT data FROM slots ORDER BY id')
    .all()
    .map((r) => JSON.parse(String(r.data)) as Slot);
const appointments = (): Appointment[] =>
  db
    .prepare('SELECT b.data booking,s.data slot FROM bookings b JOIN slots s ON b.slot_id=s.id')
    .all()
    .map((r) => {
      const b = JSON.parse(String(r.booking)),
        slot = JSON.parse(String(r.slot));
      return { ...b, slot, clinician: clinicians.find((c) => c.id === slot.clinicianId)! };
    })
    .sort((a, b) => `${a.slot.date}${a.slot.time}`.localeCompare(`${b.slot.date}${b.slot.time}`));
const booked = (slotId: string) =>
  !!db.prepare("SELECT id FROM bookings WHERE slot_id=? AND status='confirmed'").get(slotId);
if (!get('system', 'seed')) {
  const s = allSlots()
    .filter((s) => s.route === 'nurse')
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  const createdAt = new Date(Date.now() - 86400000).toISOString();
  const req: CareRequest = {
    id: 'WB-1001',
    createdAt,
    input: history[5].input,
    decision: {
      route: 'nurse',
      summary: 'Routine blood pressure check requested by your GP.',
      reason: 'This is a planned appointment with your practice nurse.',
      nextStep: 'Attend your booked appointment.',
      safetyNet: 'Contact your practice if your health changes before your visit.',
      needsReview: false,
      source: 'safety',
    },
    status: 'booked',
    notes: 'Routine review arranged after your last GP visit.',
    history: [{ at: createdAt, text: 'Planned nursing review arranged by the practice.' }],
  };
  put('request', req);
  if (s) {
    const provider = clinicians.find((c) => c.id === s.clinicianId);
    const b: Booking = {
      funding: clinicianFunding(provider),
      feeGbp: consultationFee(provider),
      id: 'WB-A1001',
      requestId: req.id,
      slotId: s.id,
      status: 'confirmed',
      createdAt,
      reason: 'Blood pressure review',
    };
    db.prepare('INSERT INTO bookings VALUES(?,?,?,?,?)').run(
      b.id,
      b.slotId,
      b.requestId,
      b.status,
      JSON.stringify(b),
    );
  }
  put('system', { id: 'seed' });
}
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
installAuth(app, db);
installUrgentWait(app, db);
installUrgentWorkspace(app);
installBenchmark(app, db);
installEndpointComparison(app, db);
const owns = (r: CareRequest | undefined, res: express.Response) =>
  r && (r.patientId || 'maya') === res.locals.user.id;
app.get('/api/state', (_req, res) => {
  const records = read<any>('example'),
    evals = read<any>('evaluation');
  res.json({
    patient: res.locals.user.profile,
    practice,
    clinicians,
    appointments: appointments().filter((a) => owns(get<CareRequest>('request', a.requestId), res)),
    requests: read<CareRequest>('request')
      .filter((r) => owns(r, res))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    configured: !!process.env.MUBIT_API_KEY,
    model: process.env.MUBIT_MODEL || 'claude-haiku-4-5',
    training: {
      available: 100 + expandedTraining.length + training500.length,
      recorded: records.length,
      evalAvailable: 20,
      jobs: read<TrainingJob>('job').sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      taskName,
      consoleUrl: process.env.MUBIT_CONSOLE_URL || 'https://app.mubit.ai/console/',
      consoleSnapshot:
        process.env.MUBIT_SHOW_DEMO_TRAINING_SNAPSHOT === 'true'
          ? {
              checkedAt: '2026-10-24T12:20:31Z',
              kept: 181,
              waiting: null,
              training:
                'v1: 77.8% on 18 fixed test cases. 87 additional examples accepted; 8 rejected. Refresh policy: every 24 hours with 25 new accepted examples. v2 not yet verified.',
              serving: 'Not live; no linked request route',
            }
          : undefined,
    },
    evaluation: {
      count: evals.length,
      matched: evals.filter((e) => e.expected === e.decision.route).length,
      meanLatencyMs: evals.length
        ? Math.round(evals.reduce((a, e) => a + (e.decision.durationMs || 0), 0) / evals.length)
        : null,
    },
  });
});
async function createCareRequest(
  input: Intake,
  patientId: string,
  human = false,
  carePreference?: CarePreference,
) {
  let decision: Decision;
  if (human)
    decision = {
      route: 'review',
      summary: input.symptoms.slice(0, 200),
      reason: 'You have asked the practice team to review your request.',
      nextStep: 'The practice team will review this fictional request.',
      safetyNet: 'For urgent help, contact NHS 111. For an emergency call 999.',
      needsReview: true,
      source: 'unavailable',
    };
  else decision = await navigatePatientRequest(input);
  // An explicit emergency must not be bypassed by choosing human review.
  if (input.redFlags.length)
    decision = {
      route: 'emergency',
      summary: 'Possible emergency symptoms reported.',
      reason: 'Do not wait for this portal or an appointment.',
      nextStep: 'Call 999 now.',
      safetyNet: 'Seek emergency help now.',
      needsReview: true,
      source: 'safety',
    };
  decision = applyCarePreference(decision, carePreference);
  const r: CareRequest = {
    carePreference,
    patientId,
    id: 'WB-' + randomUUID().slice(0, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    input,
    decision,
    status: ['urgent', 'emergency'].includes(decision.route)
      ? 'urgent'
      : decision.needsReview || decision.route === 'review'
        ? 'review'
        : 'awaiting_booking',
    notes: '',
    history: [
      {
        at: new Date().toISOString(),
        text:
          decision.source === 'mubit'
            ? 'Care navigation completed.'
            : decision.source === 'safety'
              ? 'Safety guidance shown.'
              : 'Request sent for review.',
      },
    ],
  };
  put('request', r);
  return r;
}
app.post('/api/requests', async (req, res) =>
  res
    .status(201)
    .json(
      await createCareRequest(
        intakeSchema.parse(req.body.input),
        res.locals.user.id,
        req.body.human === true,
        req.body.carePreference ? preferenceSchema.parse(req.body.carePreference) : undefined,
      ),
    ),
);
installSupportChat(app, db, {
  createRequest: createCareRequest,
  getRequest: (id) => get<CareRequest>('request', id),
  appointments,
  reserve,
});
app.get('/api/slots', (req, res) => {
  const q = z
    .object({
      requestId: z.string(),
      clinician: z.string().optional(),
      funding: z.enum(['NHS', 'Private']).optional(),
      mode: z.string().optional(),
    })
    .parse(req.query);
  const r = get<CareRequest>('request', q.requestId);
  if (!r || !owns(r, res)) return res.status(404).json({ error: 'Request not found.' });
  if (r.status === 'review' || r.status === 'urgent' || r.status === 'closed') return res.json([]);
  res.json(
    allSlots()
      .filter(
        (s) =>
          s.route === r.decision.route &&
          clinicianFunding(clinicians.find((c) => c.id === s.clinicianId)) ===
            (q.funding || r.carePreference?.funding || 'NHS') &&
          slotInstant(s) > new Date() &&
          !booked(s.id) &&
          (!q.clinician || s.clinicianId === q.clinician) &&
          (!q.mode || s.mode === q.mode),
      )
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
  );
});
function reserve(requestId: string, slotId: string, replaceId?: string) {
  const r = get<CareRequest>('request', requestId);
  if (!r || !['awaiting_booking', 'booked'].includes(r.status))
    throw Error('This request needs practice review before booking.');
  const slotRow = db.prepare('SELECT data FROM slots WHERE id=?').get(slotId);
  if (!slotRow) throw Error('Appointment not found.');
  const s = JSON.parse(String(slotRow.data)) as Slot;
  if (s.route !== r.decision.route || slotInstant(s) <= new Date())
    throw Error('This appointment is not suitable or has already passed.');
  if (booked(slotId))
    throw Error('That appointment has just been taken. Please choose another time.');
  db.exec('BEGIN IMMEDIATE');
  try {
    if (replaceId) {
      const row = db
        .prepare("SELECT data FROM bookings WHERE id=? AND request_id=? AND status='confirmed'")
        .get(replaceId, requestId);
      if (!row) throw Error('The original appointment is no longer available to change.');
      const old = JSON.parse(String(row.data));
      old.status = 'cancelled';
      db.prepare('UPDATE bookings SET status=?,data=? WHERE id=?').run(
        'cancelled',
        JSON.stringify(old),
        replaceId,
      );
    }
    const provider = clinicians.find((c) => c.id === s.clinicianId);
    const b: Booking = {
      funding: clinicianFunding(provider),
      feeGbp: consultationFee(provider),
      id: 'WB-A' + randomUUID().slice(0, 7).toUpperCase(),
      requestId,
      slotId,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      reason: r.decision.summary,
    };
    db.prepare('INSERT INTO bookings VALUES(?,?,?,?,?)').run(
      b.id,
      slotId,
      requestId,
      b.status,
      JSON.stringify(b),
    );
    r.status = 'booked';
    r.history.push({
      at: b.createdAt,
      text: replaceId ? 'Appointment rescheduled.' : 'Appointment booked.',
    });
    put('request', r);
    db.exec('COMMIT');
    return b;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
app.post('/api/bookings', (req, res) => {
  const p = z
    .object({ requestId: z.string(), slotId: z.string(), replaceId: z.string().optional() })
    .parse(req.body);
  if (!owns(get<CareRequest>('request', p.requestId), res))
    return res.status(404).json({ error: 'Request not found.' });
  try {
    res.status(201).json(reserve(p.requestId, p.slotId, p.replaceId));
  } catch (e) {
    res.status(409).json({ error: (e as Error).message });
  }
});
app.post('/api/bookings/:id/cancel', (req, res) => {
  const row = db.prepare('SELECT data FROM bookings WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Appointment not found.' });
  const b = JSON.parse(String(row.data)) as Booking;
  if (!owns(get<CareRequest>('request', b.requestId), res))
    return res.status(404).json({ error: 'Appointment not found.' });
  if (b.status !== 'confirmed') return res.json(b);
  b.status = 'cancelled';
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE bookings SET status=?,data=? WHERE id=?').run(
      b.status,
      JSON.stringify(b),
      b.id,
    );
    const r = get<CareRequest>('request', b.requestId)!;
    r.status = 'awaiting_booking';
    r.history.push({
      at: new Date().toISOString(),
      text: 'Appointment cancelled. You can choose a new time.',
    });
    put('request', r);
    db.exec('COMMIT');
    res.json(b);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
});
app.get('/api/bookings/:id/calendar', (req, res) => {
  const a = appointments().find((a) => a.id === req.params.id && a.status === 'confirmed');
  if (!a || !owns(get<CareRequest>('request', a.requestId), res))
    return res.status(404).send('Appointment not found.');
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const start = slotInstant(a.slot);
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', 'attachment; filename="wellby-appointment.ics"');
  res.send(
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wellby//Fictional appointments//EN',
      'BEGIN:VEVENT',
      `UID:${a.id}@wellby.local`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(new Date(start.getTime() + services[a.slot.route].duration * 60000))}`,
      `SUMMARY:Demo appointment with ${a.clinician.name}`,
      `LOCATION:${a.clinician.location}`,
      `DESCRIPTION:Fictional appointment. Not a real medical booking. Reference ${a.id}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n'),
  );
});
app.patch('/api/staff/requests/:id', (req, res) => {
  const p = z
    .object({
      route: z.enum(['pharmacy', 'gp', 'nurse', 'physio', 'urgent', 'emergency', 'review']),
      notes: z.string().min(5).max(2000),
    })
    .parse(req.body);
  const r = get<CareRequest>('request', req.params.id);
  if (!r || !owns(r, res)) return res.status(404).json({ error: 'Request not found.' });
  if (r.status === 'booked')
    return res
      .status(409)
      .json({ error: 'Cancel the existing appointment before changing its care pathway.' });
  r.decision = {
    ...r.decision,
    route: p.route,
    reason: p.notes,
    nextStep: ['urgent', 'emergency'].includes(p.route)
      ? 'Follow the urgent care guidance.'
      : 'Choose a suitable appointment.',
    needsReview: p.route === 'review',
  };
  r.notes = p.notes;
  r.status = ['urgent', 'emergency'].includes(p.route)
    ? 'urgent'
    : p.route === 'review'
      ? 'review'
      : 'awaiting_booking';
  r.history.push({ at: new Date().toISOString(), text: `Practice review: ${p.route}. ${p.notes}` });
  put('request', r);
  res.json(r);
});
let active: string | null = null;
const stops = new Set<string>();
app.get('/api/staff/history', (_req, res) =>
  res.json([...history, ...expandedTraining, ...training500]),
);
app.get('/api/staff/receipts', (_req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="wellby-request-receipts.json"');
  res.json({ training: read('example'), evaluation: read('evaluation') });
});
app.post('/api/staff/batch', async (req, res) => {
  const p = z
    .object({ count: z.number().int().min(1).max(100), kind: z.enum(['training', 'evaluation']) })
    .parse(req.body);
  if (active || read<TrainingJob>('job').some((j) => j.status === 'running'))
    return res.status(409).json({ error: 'A batch is already running.' });
  if (!process.env.MUBIT_API_KEY) return res.status(400).json({ error: 'Mubit key is missing.' });
  const kind = p.kind === 'training' ? 'example' : 'evaluation';
  const done = new Set(read<any>(kind).map((r) => r.id));
  const items = history.filter((h) => h.split === p.kind && !done.has(h.id)).slice(0, p.count);
  if (!items.length)
    return res.status(400).json({ error: 'All available cases have been processed.' });
  const j: TrainingJob = {
    id: randomUUID(),
    status: 'running',
    count: items.length,
    completed: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
  };
  put('job', j);
  active = j.id;
  res.status(202).json(j);
  void (async () => {
    try {
      for (const h of items) {
        if (stops.has(j.id)) break;
        try {
          const d = await navigate(
            h.input,
            p.kind === 'training',
            true,
            'wellby-' + p.kind + '-' + h.id,
          );
          put(kind, {
            id: h.id,
            input: h.input,
            topic: h.topic,
            decision: d,
            expected: h.expected,
            sessionId: 'wellby-' + p.kind + '-' + h.id,
            model: process.env.MUBIT_MODEL || 'claude-haiku-4-5',
            instructionHash: createHash('sha256').update(instructions).digest('hex'),
            acceptance: 'Not verified in Mubit',
            at: new Date().toISOString(),
          });
          j.completed++;
        } catch (e) {
          j.errors++;
          j.error = (e as Error).message;
        }
        put('job', j);
        if (j.errors >= 3) break;
      }
    } finally {
      j.status = stops.has(j.id) ? 'cancelled' : j.errors ? 'partial' : 'complete';
      put('job', j);
      stops.delete(j.id);
      active = null;
    }
  })();
});
app.post('/api/staff/batch/:id/stop', (req, res) => {
  stops.add(req.params.id);
  put('system', { id: 'stop-job-' + req.params.id });
  res.json({ ok: true });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'This page could not be found.' }));
app.use((e: any, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
  res.status(400).json({
    error:
      e instanceof z.ZodError
        ? 'Please complete the required fields before continuing.'
        : e.message || 'Something went wrong.',
  }),
);
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('/{*path}', (_req, res) => res.sendFile('index.html', { root: process.cwd() + '/dist' }));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.listen(Number(process.env.PORT || 4174), '127.0.0.1', () =>
  console.log('Wellby · http://127.0.0.1:4174'),
);
