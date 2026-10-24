import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { expandedTraining } from './training-expansion';
import { training500 } from './training-500';
import { instructions, decisionSchema } from './navigation';
import { hash } from './benchmark-data';

// Explicit invocation only. No auto retry, no evaluation traffic, no model switch.
const count = Number(process.argv.find((v) => v.startsWith('--count='))?.split('=')[1] || 0);
const send = process.argv.includes('--send');
const target = Number(process.argv.find((v) => v.startsWith('--target='))?.split('=')[1] || 0);
if (
  !(Number.isInteger(target) && target >= 1 && target <= 500) &&
  !(Number.isInteger(count) && count >= 1 && count <= 500)
)
  throw Error('Use --target=1..500 or --count=1..500; add --send to submit.');
mkdirSync('.wellby', { recursive: true });
const db = new DatabaseSync('.wellby/practice.sqlite');
db.exec(
  'PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS training_attempts(id TEXT PRIMARY KEY,data TEXT NOT NULL)',
);
const model = 'claude-haiku-4-5';
const fingerprint = hash({ model, instructions });
const attempted = new Set(
  db
    .prepare('SELECT id FROM training_attempts')
    .all()
    .map((r) => r.id),
);
const recorded = new Set(
  db
    .prepare("SELECT id FROM records WHERE kind='example'")
    .all()
    .map((r) => r.id),
);
// Round-robin routes so even a small first batch covers every pathway.
const pool = [...expandedTraining, ...training500].sort((a, b) => {
  const av = a.id.startsWith('T3-') ? Number(a.id.slice(-1)) : -1;
  const bv = b.id.startsWith('T3-') ? Number(b.id.slice(-1)) : -1;
  return av - bv || a.id.localeCompare(b.id);
});
const pending = pool
  .filter((c) => !attempted.has(`${fingerprint}:${c.id}`) && !recorded.has(c.id))
  .slice(0, target ? Math.max(0, target - recorded.size) : count);
console.log(
  JSON.stringify({
    mode: send ? 'submit' : 'dry-run',
    model,
    pending: pending.length,
    total: pool.length,
    alreadyRecorded: recorded.size,
    target: target || null,
    byRoute: pending.reduce(
      (a, c) => ({ ...a, [c.expected]: (a[c.expected] || 0) + 1 }),
      {} as Record<string, number>,
    ),
  }),
);
if (!send) process.exit(0);
if (!process.env.MUBIT_API_KEY) throw Error('Mubit key missing');
if (
  db
    .prepare("SELECT data FROM records WHERE kind='job'")
    .all()
    .some((r) => JSON.parse(String(r.data)).status === 'running')
)
  throw Error('An existing training job is running.');
const lock = '.wellby/training-expansion.lock';
const fd = openSync(lock, 'wx');
const job = {
  id: randomUUID(),
  status: 'running',
  count: pending.length,
  completed: 0,
  errors: 0,
  startedAt: new Date().toISOString(),
  model,
  dataset: target ? 'T3-target-' + target : 'T2-T3',
  error: '',
};
const put = db.prepare('INSERT OR REPLACE INTO records(kind,id,data) VALUES(?,?,?)');
const saveAttempt = db.prepare('INSERT OR REPLACE INTO training_attempts(id,data) VALUES(?,?)');
let stopped = false;
let consecutive = 0;
process.on('SIGINT', () => {
  stopped = true;
});
process.on('SIGTERM', () => {
  stopped = true;
});
try {
  put.run('job', job.id, JSON.stringify(job));
  for (const c of pending) {
    if (
      stopped ||
      db.prepare("SELECT id FROM records WHERE kind='system' AND id=?").get('stop-job-' + job.id)
    ) {
      stopped = true;
      break;
    }
    const id = `${fingerprint}:${c.id}`,
      start = Date.now(),
      sessionId = `wellby-training-${c.id}`;
    const receipt: any = {
      id,
      caseId: c.id,
      model,
      instructionHash: hash(instructions),
      inputHash: c.inputHash,
      at: new Date().toISOString(),
      state: 'started',
      acceptance: 'Not verified in Mubit',
    };
    saveAttempt.run(id, JSON.stringify(receipt));
    try {
      const r = await fetch('https://api.mubit.ai/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.MUBIT_API_KEY!,
          'anthropic-version': '2023-06-01',
          'x-middleware-record': 'full',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          system: instructions,
          metadata: { user_id: sessionId },
          messages: [{ role: 'user', content: JSON.stringify(c.input) }],
        }),
        signal: AbortSignal.timeout(45000),
      });
      receipt.status = r.status;
      receipt.requestId = r.headers.get('x-middleware-request-id');
      receipt.durationMs = Date.now() - start;
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      const raw: any = await r.json();
      receipt.raw = raw;
      receipt.usage = raw.usage;
      receipt.returnedModel = raw.model;
      if (!receipt.requestId) throw Error('Missing Mubit receipt');
      const text =
        raw.content
          ?.filter((v: any) => v.type === 'text')
          .map((v: any) => v.text)
          .join('') || '';
      const decision = decisionSchema.parse(
        JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)),
      );
      // Preserve raw teacher choice. Do not replace it with our safety override or label.
      receipt.state = 'recorded';
      receipt.route = decision.route;
      receipt.expected = c.expected;
      receipt.labelAgreement = decision.route === c.expected;
      put.run(
        'example',
        c.id,
        JSON.stringify({
          ...c,
          decision: {
            ...decision,
            source: 'mubit',
            requestId: receipt.requestId,
            durationMs: receipt.durationMs,
          },
          sessionId,
          model,
          instructionHash: receipt.instructionHash,
          acceptance: receipt.acceptance,
          at: receipt.at,
          trainingSet: c.id.startsWith('T3-') ? 'T3-context-augmentation' : 'T2',
        }),
      );
      job.completed++;
      consecutive = 0;
    } catch (e) {
      receipt.state = 'error';
      receipt.error = (e as Error).message;
      job.errors++;
      job.error = receipt.error;
      consecutive++;
    }
    saveAttempt.run(id, JSON.stringify(receipt));
    put.run('job', job.id, JSON.stringify(job));
    console.log(
      JSON.stringify({
        case: c.id,
        state: receipt.state,
        route: receipt.route,
        expected: c.expected,
        requestId: receipt.requestId,
        error: receipt.error,
        completed: job.completed,
        errors: job.errors,
      }),
    );
    if (
      consecutive >= 3 ||
      receipt.status === 401 ||
      receipt.status === 402 ||
      receipt.status === 429
    )
      break;
  }
} finally {
  job.status = stopped ? 'cancelled' : job.completed === job.count ? 'complete' : 'partial';
  put.run('job', job.id, JSON.stringify(job));
  closeSync(fd);
  unlinkSync(lock);
  db.close();
  console.log(JSON.stringify(job));
}
