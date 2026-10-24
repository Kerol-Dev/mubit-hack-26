import test from 'node:test';
import assert from 'node:assert/strict';
import {
  forecastPayload,
  urgentSafety,
  waitResponseSchema,
  miles,
  londonFeatures,
} from './urgent-wait';
import { waitHistory } from './urgent-history';
test('Historical, training and test encounters are disjoint, dated and labelled synthetic', () => {
  assert.equal(waitHistory.length, 1800);
  assert.equal(new Set(waitHistory.map((x) => x.id)).size, 1800);
  assert.equal(waitHistory.filter((x) => x.split === 'history').length, 1200);
  assert.equal(waitHistory.filter((x) => x.split === 'training').length, 500);
  assert.equal(waitHistory.filter((x) => x.split === 'evaluation').length, 100);
  assert.ok(waitHistory.every((x) => x.provenance === 'synthetic' && x.arrival < '2026-10-24'));
});
test('Model input contains historical cohort only, never test target or postcode', () => {
  const sample = waitHistory.find((x) => x.split === 'evaluation')!;
  const p = forecastPayload(sample.symptoms, sample.condition, sample, [sample.siteId]);
  assert.equal(p.sites.length, 1);
  assert.equal(p.sites[0].historicalCohort.sampleSize, 40);
  assert.ok(!JSON.stringify(p).includes('waitMinutes'));
  assert.ok(!JSON.stringify(p).includes('postcode'));
});
test('Emergency and review flags bypass wait forecasts', () => {
  assert.equal(
    urgentSafety({ symptoms: 'I have chest pain', emergency: false, adult: true }),
    'emergency',
  );
  assert.equal(
    urgentSafety({ symptoms: 'An ankle injury', emergency: true, adult: true }),
    'emergency',
  );
  assert.equal(
    urgentSafety({ symptoms: 'An ankle injury', emergency: false, adult: false }),
    'review',
  );
  assert.equal(
    urgentSafety({ symptoms: 'Severe worsening pain', emergency: false, adult: true }),
    'review',
  );
});
test('Invalid ranges cannot reach patients', () => {
  assert.equal(
    waitResponseSchema.safeParse({
      status: 'estimate',
      message: 'test',
      estimates: [
        {
          siteId: 'a',
          estimateMinutes: 100,
          lowMinutes: 120,
          highMinutes: 60,
          explanation: 'test',
        },
      ],
    }).success,
    false,
  );
});
test('Location and London time are calculated rather than invented', () => {
  assert.equal(miles({ latitude: 51.5, longitude: -0.2 }, { latitude: 51.5, longitude: -0.2 }), 0);
  assert.deepEqual(londonFeatures(new Date('2026-10-24T12:00:00Z')), {
    hour: 13,
    weekday: 6,
    month: 10,
  });
});

test('Gateway calls exclude patient recording by default and never infer adapter use from a model alias', async () => {
  const { callWaitModel } = await import('./urgent-wait');
  const savedFetch = globalThis.fetch,
    savedKey = process.env.MUBIT_API_KEY;
  process.env.MUBIT_API_KEY = 'test-only-key';
  const p = forecastPayload(
    'A mild ankle injury with no concerning changes.',
    'Injury or sprain',
    { hour: 12, weekday: 1, month: 10 },
    ['central-middlesex'],
  );
  let headers: Record<string, string> = {};
  let answer: any = {
    status: 'estimate',
    message: 'Historical range',
    estimates: [
      {
        siteId: 'central-middlesex',
        estimateMinutes: 50,
        lowMinutes: 30,
        highMinutes: 80,
        explanation: 'Comparable visits',
      },
    ],
  };
  let receipt = true;
  globalThis.fetch = async (_url, options) => {
    headers = options?.headers as Record<string, string>;
    return new Response(
      JSON.stringify({
        model: 'claude-haiku-4-5',
        content: [{ type: 'text', text: JSON.stringify(answer) }],
      }),
      { status: 200, headers: receipt ? { 'x-middleware-request-id': 'mreq_test' } : {} },
    );
  };
  try {
    const out = await callWaitModel(p);
    assert.equal(headers['x-middleware-record'], 'metadata');
    assert.equal(out.receipt.serving, 'unverified');
    await callWaitModel(p, 'off');
    assert.equal(headers['x-middleware-record'], 'off');
    receipt = false;
    await assert.rejects(callWaitModel(p), /no request receipt/);
    receipt = true;
    answer.estimates[0].siteId = 'invented-hospital';
    await assert.rejects(callWaitModel(p), /selected centres/);
    answer.status = 'emergency';
    await assert.rejects(callWaitModel(p), /mixed a safety diversion/);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) delete process.env.MUBIT_API_KEY;
    else process.env.MUBIT_API_KEY = savedKey;
  }
});
