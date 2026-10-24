import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { installSupportChat, supportReply } from './support-chat';
import type { Intake, Patient, CareRequest, Appointment } from '../shared/types';
const patient = {
  age: 29,
  conditions: 'None reported',
  medications: 'None reported',
  email: 'private@example.test',
  name: 'Private Name',
} as Patient;
const input: Intake = {
  symptoms: 'A mildly sore knee after exercise, no injury or swelling.',
  duration: 'Three days',
  severity: 'mild',
  age: 29,
  pregnant: false,
  conditions: 'None reported',
  medications: 'None reported',
  redFlags: [],
  goal: 'Advice',
  consent: false,
};
test('support uses Mubit Haiku with content excluded from training, validated intake and no profile identifiers', async () => {
  const old = process.env.MUBIT_API_KEY;
  process.env.MUBIT_API_KEY = 'test-only';
  try {
    let payload: any;
    const reply = await supportReply(
      [{ role: 'user', text: 'My knee is sore' }],
      patient,
      [],
      async (url, options) => {
        assert.equal(url, 'https://api.mubit.ai/anthropic/v1/messages');
        assert.equal((options!.headers as any)['x-middleware-record'], 'metadata');
        payload = JSON.parse(String(options!.body));
        return new Response(
          JSON.stringify({
            content: [
              {
                type: 'text',
                text: JSON.stringify({ text: 'Please check your summary.', intake: input }),
              },
            ],
          }),
          { headers: { 'x-middleware-request-id': 'receipt-test' } },
        );
      },
    );
    assert.equal(payload.model, 'claude-haiku-4-5');
    assert.match(payload.system, /requests waiting-time forecasts through Mubit/);
    assert.match(payload.system, /Never invent a centre, distance or waiting time/);
    assert.equal(reply.intake?.symptoms, input.symptoms);
    assert.equal(reply.receipt, 'receipt-test');
    assert.ok(!JSON.stringify(payload).includes(patient.email));
    assert.ok(!JSON.stringify(payload).includes(patient.name));
    await assert.rejects(
      () =>
        supportReply(
          [],
          patient,
          [],
          async () =>
            new Response(
              JSON.stringify({
                content: [{ type: 'text', text: '{"text":"Hello","intake":null}' }],
              }),
            ),
        ),
      /could not be verified/,
    );
    await assert.rejects(
      () =>
        supportReply(
          [],
          patient,
          [],
          async () =>
            new Response(
              JSON.stringify({
                content: [{ type: 'text', text: '{"text":"Hello","intake":{"route":"gp"}}' }],
              }),
            ),
        ),
      /could not finish/,
    );
  } finally {
    if (old === undefined) delete process.env.MUBIT_API_KEY;
    else process.env.MUBIT_API_KEY = old;
  }
});
test('chat routes through shared navigation, isolates patients and confirms a booking once', async () => {
  const db = new DatabaseSync(':memory:'),
    app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.locals.user = { id: req.headers['x-test-patient'] || 'maya', profile: patient };
    next();
  });
  const requests = new Map<string, CareRequest>();
  const appointments: Appointment[] = [];
  let routes = 0,
    bookings = 0;
  installSupportChat(app, db, {
    reply: async () => ({ text: 'Check your summary.', intake: input, receipt: 'mock-receipt' }),
    createRequest: async (value, patientId) => {
      routes++;
      assert.deepEqual(value, input);
      const r: CareRequest = {
        id: 'request-1',
        patientId,
        input: value,
        createdAt: new Date().toISOString(),
        decision: {
          route: 'physio',
          summary: 'Sore knee',
          reason: 'Example route',
          nextStep: 'Choose a time',
          safetyNet: 'Seek help if worsening',
          needsReview: false,
          source: 'mubit',
        },
        status: 'awaiting_booking',
        notes: '',
        history: [],
      };
      requests.set(r.id, r);
      return r;
    },
    getRequest: (id) => requests.get(id),
    appointments: () => appointments,
    reserve: (requestId, slotId) => {
      bookings++;
      const a = { id: 'booking-1', requestId, slotId, status: 'confirmed' } as Appointment;
      appointments.push(a);
      return a;
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const port = (server.address() as any).port;
  const post = async (path: string, body: unknown, person = 'maya') => {
    const r = await fetch(`http://127.0.0.1:${port}/api/support-chat/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-patient': person },
      body: JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  };
  try {
    const messageId = randomUUID(),
      first = await post('message', { text: 'Fictional knee symptoms', id: messageId });
    assert.equal(first.status, 200);
    const assistant = first.data.messages.at(-1);
    const duplicate = await post('message', { text: 'Fictional knee symptoms', id: messageId });
    assert.equal(duplicate.data.messages.length, 2);
    assert.equal((await post('route', { messageId: assistant.id }, 'other')).status, 404);
    const routed = await post('route', { messageId: assistant.id });
    assert.equal(routed.data.messages.at(-1).request.decision.route, 'physio');
    await post('route', { messageId: assistant.id });
    assert.equal(routes, 1);
    const routeMessage = routed.data.messages.at(-1).id;
    assert.equal(
      (await post('book', { messageId: routeMessage, slotId: 'slot-1' }, 'other')).status,
      404,
    );
    assert.equal((await post('book', { messageId: routeMessage, slotId: 'slot-1' })).status, 201);
    assert.equal((await post('book', { messageId: routeMessage, slotId: 'slot-1' })).status, 200);
    assert.equal(bookings, 1);
    assert.equal((await post('book', { messageId: routeMessage, slotId: 'slot-2' })).status, 409);
    const other = await fetch(`http://127.0.0.1:${port}/api/support-chat`, {
      headers: { 'x-test-patient': 'other' },
    }).then((r) => r.json());
    assert.deepEqual(other.messages, []);
    const next = await post('message', { text: 'A new concern', id: randomUUID() });
    const stale = next.data.messages.at(-1).id;
    await post('message', { text: 'Actually I need to correct those details', id: randomUUID() });
    assert.equal((await post('route', { messageId: stale })).status, 409);
    const urgent = await post(
      'message',
      {
        text: 'I need urgent care, what is closest to w106dz and estimated wait time?',
        id: randomUUID(),
      },
      'urgent-test',
    );
    assert.deepEqual(urgent.data.messages.at(-1).urgentCare, { postcode: 'W10 6DZ' });
    assert.equal(urgent.data.messages.at(-1).draft, undefined);
    const emergency = await post(
      'message',
      { text: 'I have chest pain, find nearest urgent care', id: randomUUID() },
      'urgent-test',
    );
    assert.equal(emergency.data.messages.at(-1).urgentCare, undefined);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  }
});

test('Urgent-care search recognises waiting-time requests and keeps unrelated questions unchanged', async () => {
  const { urgentCareSearch } = await import('../shared/support-chat');
  assert.deepEqual(urgentCareSearch('Nearest hospital to m1 7fy?'), { postcode: 'M1 7FY' });
  assert.deepEqual(urgentCareSearch('What is the waiting time?'), { postcode: '' });
  assert.equal(urgentCareSearch('Can you help with my appointment?'), undefined);
});
