import test from 'node:test';
import assert from 'node:assert/strict';
import { navigate, navigatePatientRequest } from './navigation';
import type { Intake } from '../shared/types';
const input: Intake = {
  symptoms: 'A fictional mild shoulder ache after desk work.',
  duration: '3 weeks',
  severity: 'mild',
  age: 30,
  pregnant: false,
  conditions: '',
  medications: '',
  redFlags: [],
  goal: 'Movement advice',
  consent: true,
};
const decision = {
  route: 'physio',
  summary: 'Fictional shoulder ache.',
  reason: 'Routine movement concern.',
  nextStep: 'Choose a demo visit.',
  safetyNet: 'Seek help if symptoms worsen.',
  needsReview: false,
};
async function capture(t: any, flag: string | undefined, evaluation = false) {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.MUBIT_API_KEY,
    oldFlag = process.env.MUBIT_RECORD_DEMO_REQUESTS;
  t.after(() => {
    globalThis.fetch = oldFetch;
    for (const [k, v] of Object.entries({
      MUBIT_API_KEY: oldKey,
      MUBIT_RECORD_DEMO_REQUESTS: oldFlag,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  process.env.MUBIT_API_KEY = 'test-key';
  if (flag === undefined) delete process.env.MUBIT_RECORD_DEMO_REQUESTS;
  else process.env.MUBIT_RECORD_DEMO_REQUESTS = flag;
  let recording = '';
  let endpoint = '';
  globalThis.fetch = (async (url: any, init: any) => {
    endpoint = String(url);
    recording = init.headers['x-middleware-record'];
    return new Response(
      JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(decision) }] }),
      {
        headers: {
          'content-type': 'application/json',
          'x-middleware-request-id': 'mreq_test_receipt',
        },
      },
    );
  }) as typeof fetch;
  const result = await (evaluation ? navigate(input, false) : navigatePatientRequest(input));
  assert.equal(endpoint, 'https://api.mubit.ai/anthropic/v1/messages');
  assert.equal(result.source, 'mubit');
  assert.equal(result.requestId, 'mreq_test_receipt');
  return recording;
}
test('fictional portal recording opt-in sends full recording and preserves the gateway receipt', async (t) => {
  assert.equal(await capture(t, 'true'), 'full');
});
test('patient content stays metadata-only unless explicitly opted in', async (t) => {
  assert.equal(await capture(t, undefined), 'metadata');
});
test('evaluation remains metadata-only when fictional portal recording is enabled', async (t) => {
  assert.equal(await capture(t, 'true', true), 'metadata');
});
