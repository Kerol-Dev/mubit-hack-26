import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { nearestSites, nationalHelp, nationalSites, lookupPostcode } from './urgent-directory';
import { installUrgentWait } from './urgent-wait';
import { urgentSummary } from './urgent-workspace';
test('UK directory finds nearby sourced services in all four nations', () => {
  for (const p of [
    { latitude: 53.475, longitude: -2.236, country: 'England' },
    { latitude: 55.953, longitude: -3.188, country: 'Scotland' },
    { latitude: 51.481, longitude: -3.179, country: 'Wales' },
    { latitude: 54.597, longitude: -5.93, country: 'Northern Ireland' },
  ]) {
    const found = nearestSites(p);
    assert.equal(found.length, 5);
    assert.equal(found[0].site.country, p.country);
    assert.ok(found[0].distanceMiles < 10);
    assert.ok(found.every((x) => x.site.sourceUrl?.startsWith('https://')));
    assert.ok(found.every((x, i) => i === 0 || x.distanceMiles >= found[i - 1].distanceMiles));
  }
  assert.ok(nationalSites.length > 200);
  assert.match(nationalHelp('Scotland').label, /NHS 24/);
  assert.match(nationalHelp('Wales').label, /Wales/);
  assert.match(nationalHelp('Northern Ireland').url, /nidirect/);
});
test('Manchester search returns real centres without making unsupported forecast calls', async () => {
  const savedFetch = globalThis.fetch;
  let modelCalls = 0;
  const db = new DatabaseSync(':memory:');
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.user = { id: 'test' };
    next();
  });
  installUrgentWait(app, db);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const port = (server.address() as any).port;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('postcodes.io'))
      return new Response(
        JSON.stringify({
          result: { postcode: 'M1 7FY', country: 'England', latitude: 53.4735, longitude: -2.2367 },
        }),
      );
    if (String(url).includes('mubit.ai')) {
      modelCalls++;
      throw Error('Unexpected model call');
    }
    return savedFetch(url, options);
  };
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/urgent-care/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postcode: 'M1 7FY',
        symptoms: 'My ankle is sore after a small twist this morning.',
        condition: 'Injury or sprain',
        emergency: false,
        adult: true,
      }),
    });
    const result: any = await r.json();
    assert.equal(r.status, 200);
    assert.equal(result.status, 'directory');
    assert.equal(result.directory.postcode, 'M1 7FY');
    assert.ok(result.results.some((x: any) => /Manchester Royal Infirmary/.test(x.site.name)));
    assert.ok(result.results.every((x: any) => x.lowMinutes === null && x.highMinutes === null));
    assert.equal(modelCalls, 0);
    assert.equal(result.receipt, undefined);
    await assert.rejects(lookupPostcode('not a postcode'), /valid UK postcode/);
  } finally {
    globalThis.fetch = savedFetch;
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    db.close();
  }
});
test('Wait evaluation keeps diversions out of forecast error and never assumes adapter serving', () => {
  const s = urgentSummary([
    {
      caseId: 'a',
      success: true,
      absoluteError: 10,
      covered: true,
      receipt: { durationMs: 2000, serving: 'unverified' },
    },
    {
      caseId: 'b',
      success: true,
      absoluteError: 30,
      covered: false,
      receipt: { durationMs: 4000, serving: 'provider' },
    },
    {
      caseId: 'c',
      success: true,
      absoluteError: null,
      receipt: { durationMs: 1000, serving: 'unverified' },
    },
    { caseId: 'd', success: false, absoluteError: null },
  ]);
  assert.equal(s.meanAbsoluteErrorMinutes, 20);
  assert.equal(s.intervalCoverage, 0.5);
  assert.equal(s.safetyDiversions, 1);
  assert.equal(s.errors, 1);
  assert.equal(s.adapterServed, 0);
});
