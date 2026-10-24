import 'dotenv/config';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { waitHistory, historyHash } from './urgent-history';
import { callWaitModel, forecastPayload, waitInstructions, waitTask } from './urgent-wait';
const root = '.wellby/urgent-wait';
mkdirSync(root, { recursive: true });
const phase = process.argv.includes('--evaluate') ? 'evaluation' : 'training';
const count = Number(process.argv.find((x) => x.startsWith('--count='))?.split('=')[1] || 0);
if (!Number.isInteger(count) || count < 1 || count > (phase === 'training' ? 500 : 100))
  throw Error('Specify --count=1..500 (training) or 1..100 (evaluation).');
const instructionsHash = createHash('sha256').update(waitInstructions).digest('hex');
writeFileSync(
  root + '/dataset.json',
  JSON.stringify(
    {
      provenance: 'synthetic, not NHS records',
      waitDefinition: 'arrival to first treating clinician',
      historyHash,
      records: waitHistory,
    },
    null,
    2,
  ),
);
const path = root + `/${phase}-receipts.json`;
const receipts: any[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
const completed = new Set(receipts.map((x) => x.caseId));
const cases = waitHistory.filter((x) => x.split === phase && !completed.has(x.id)).slice(0, count);
console.log(
  JSON.stringify({
    task: waitTask,
    phase,
    prepared: waitHistory.filter((x) => x.split === phase).length,
    pending: cases.length,
    record: phase === 'training' ? 'full' : 'off',
    historyHash,
  }),
);
if (!process.argv.includes('--send')) process.exit(0);
let stopped = false,
  next = 0;
let failures = 0;
process.on('SIGTERM', () => {
  stopped = true;
});
process.on('SIGINT', () => {
  stopped = true;
});
function save() {
  writeFileSync(path, JSON.stringify(receipts, null, 2));
  const success = receipts.filter((x) => x.success);
  const measured = success.filter((x) => x.absoluteError !== null);
  const summary = {
    task: waitTask,
    phase,
    at: new Date().toISOString(),
    historyHash,
    instructionsHash,
    attempted: receipts.length,
    successful: success.length,
    errors: receipts.length - success.length,
    forecastsScored: measured.length,
    safetyDiversions: success.length - measured.length,
    meanAbsoluteErrorMinutes: measured.length
      ? Math.round((measured.reduce((a, x) => a + x.absoluteError, 0) / measured.length) * 10) / 10
      : null,
    intervalCoverage: measured.length
      ? measured.filter((x) => x.covered).length / measured.length
      : null,
    adapterServed: success.filter((x) => x.receipt.serving === 'adapter').length,
    acceptedByMubit: 'Not yet verified',
    status: stopped ? 'stopped' : next >= cases.length ? 'submitted' : 'submitting',
  };
  writeFileSync(root + `/${phase}-summary.json`, JSON.stringify(summary, null, 2));
}
async function worker() {
  while (!stopped) {
    const c = cases[next++];
    if (!c) break;
    const payload = forecastPayload(
      c.symptoms,
      c.condition,
      { hour: c.hour, weekday: c.weekday, month: c.month },
      [c.siteId],
    );
    const row: any = {
      caseId: c.id,
      at: new Date().toISOString(),
      instructionsHash,
      inputHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      historicalOutcomeMinutes: c.waitMinutes,
      success: false,
      absoluteError: null,
    };
    try {
      const out = await callWaitModel(payload, phase === 'training' ? 'full' : 'off');
      const estimate = out.answer.estimates[0];
      Object.assign(row, {
        success: true,
        receipt: out.receipt,
        usage: out.usage,
        answer: out.answer,
        absoluteError: estimate ? Math.abs(estimate.estimateMinutes - c.waitMinutes) : null,
        covered: estimate
          ? c.waitMinutes >= estimate.lowMinutes && c.waitMinutes <= estimate.highMinutes
          : false,
      });
      failures = 0;
    } catch (e) {
      row.error = (e as Error).message;
      failures++;
      if (failures >= 3 || /\(401\)|\(402\)|\(403\)|\(429\)/.test(row.error)) stopped = true;
    }
    receipts.push(row);
    save();
    if (receipts.length % 10 === 0 || !row.success)
      console.log(
        JSON.stringify({
          phase,
          attempted: receipts.length,
          success: row.success,
          error: row.error,
        }),
      );
  }
}
await Promise.all([worker(), worker()]);
save();
console.log(readFileSync(root + `/${phase}-summary.json`, 'utf8'));
