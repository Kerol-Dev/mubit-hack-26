import type express from 'express';
import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { z } from 'zod';
import { waitHistory, historyHash } from './urgent-history';
import { callWaitModel, forecastPayload, waitTask } from './urgent-wait';
import { nationalSites, directoryVersion } from './urgent-directory';
import consoleSnapshot from '../docs/evidence/urgent-care-evaluation.json';
const root = '.wellby/urgent-wait',
  runs = join(root, 'test-runs');
const read = (p: string, fallback: any = null): any =>
  existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;
const save = (p: string, data: any) => {
  mkdirSync(runs, { recursive: true });
  writeFileSync(p + '.tmp', JSON.stringify(data, null, 2));
  renameSync(p + '.tmp', p);
};
type Row = {
  caseId: string;
  success: boolean;
  absoluteError: number | null;
  covered?: boolean;
  receipt?: any;
  error?: string;
  [k: string]: unknown;
};
export function urgentSummary(rows: Row[]) {
  const success = rows.filter((x) => x.success),
    scored = success.filter((x) => x.absoluteError !== null);
  return {
    attempted: rows.length,
    successful: success.length,
    errors: rows.length - success.length,
    forecastsScored: scored.length,
    safetyDiversions: success.length - scored.length,
    meanAbsoluteErrorMinutes: scored.length
      ? Math.round((scored.reduce((s, x) => s + x.absoluteError!, 0) / scored.length) * 10) / 10
      : null,
    intervalCoverage: scored.length ? scored.filter((x) => x.covered).length / scored.length : null,
    adapterServed: success.filter((x) => x.receipt?.serving === 'adapter').length,
    averageResponseMs: success.length
      ? Math.round(success.reduce((s, x) => s + (x.receipt?.durationMs || 0), 0) / success.length)
      : null,
  };
}
let training: ChildProcess | null = null,
  active: any = null,
  stopped = false;
export function installUrgentWorkspace(app: express.Express) {
  app.get('/api/staff/urgent-care', (_req, res) => {
    const trainingRows: Row[] = read(join(root, 'training-receipts.json'), []),
      evaluationRows: Row[] = read(join(root, 'evaluation-receipts.json'), []);
    const saved = existsSync(runs)
      ? readdirSync(runs)
          .filter((x) => /^TEST-[a-f0-9-]+\.json$/.test(x))
          .map((x) => read(join(runs, x)))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];
    res.json({
      task: waitTask,
      configured: !!process.env.MUBIT_API_KEY,
      dataset: {
        history: waitHistory.filter((x) => x.split === 'history').length,
        training: 500,
        evaluation: 100,
        historyHash,
        provenance: 'Synthetic encounters',
        directorySites: nationalSites.length,
        directoryVersion,
        forecastSites: 3,
      },
      training: {
        ...urgentSummary(trainingRows),
        remaining: Math.max(0, 500 - new Set(trainingRows.map((x) => x.caseId)).size),
        running: !!training,
      },
      evaluation: {
        ...urgentSummary(evaluationRows),
        at: read(join(root, 'evaluation-summary.json'))?.at,
        rows: evaluationRows,
      },
      console: {
        observedAt: consoleSnapshot.at,
        calls: consoleSnapshot.consoleObservedCalls,
        kept: consoleSnapshot.consoleKeptExamples,
        status: consoleSnapshot.consoleStatus,
        taskId: consoleSnapshot.consoleTaskId,
        reviewLimit: consoleSnapshot.reviewLimitPerTaskPerDay,
        sentForReview: consoleSnapshot.sentForReview,
        overLimit: consoleSnapshot.overDailyReviewLimit,
        live: false,
      },
      runs: saved,
      active: active
        ? {
            id: active.id,
            attempted: active.rows.length,
            target: active.target,
            status: active.status,
          }
        : null,
    });
  });
  app.get('/api/staff/urgent-care/export', (_req, res) =>
    res.attachment('wellby-urgent-care-evidence.json').json({
      task: waitTask,
      historyHash,
      training: read(join(root, 'training-summary.json')),
      evaluation: read(join(root, 'evaluation-summary.json')),
      evaluationReceipts: read(join(root, 'evaluation-receipts.json'), []),
      consoleSnapshot,
    }),
  );
  app.post('/api/staff/urgent-care/train', (req, res) => {
    const parsed = z.object({ count: z.number().int().min(1).max(100) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose 1 to 100 examples.' });
    if (training || active)
      return res.status(409).json({ error: 'Another urgent-care run is in progress.' });
    if (!process.env.MUBIT_API_KEY)
      return res.status(503).json({ error: 'Mubit is not configured.' });
    const rows = read(join(root, 'training-receipts.json'), []),
      remaining = 500 - new Set(rows.map((x: any) => x.caseId)).size;
    if (remaining <= 0)
      return res.status(409).json({
        error:
          'All 500 training examples have already been attempted. Existing records are preserved.',
      });
    training = spawn(
      process.execPath,
      [
        '--import',
        'tsx',
        'server/urgent-training.ts',
        '--send',
        '--count=' + Math.min(parsed.data.count, remaining),
      ],
      { stdio: 'ignore' },
    );
    training.on('exit', () => {
      training = null;
    });
    training.on('error', () => {
      training = null;
    });
    res.json({ started: true, count: Math.min(parsed.data.count, remaining) });
  });
  app.post('/api/staff/urgent-care/test', (req, res) => {
    const parsed = z.object({ count: z.number().int().min(1).max(100) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose 1 to 100 test cases.' });
    if (active || training)
      return res.status(409).json({ error: 'Another urgent-care run is in progress.' });
    if (!process.env.MUBIT_API_KEY)
      return res.status(503).json({ error: 'Mubit is not configured.' });
    const run: any = {
      id: 'TEST-' + randomUUID(),
      createdAt: new Date().toISOString(),
      task: waitTask,
      historyHash,
      target: parsed.data.count,
      status: 'running',
      recording: 'off',
      rows: [],
    };
    active = run;
    stopped = false;
    save(join(runs, run.id + '.json'), run);
    res.json({ id: run.id });
    void (async () => {
      try {
        for (const c of waitHistory.filter((x) => x.split === 'evaluation').slice(0, run.target)) {
          if (stopped) break;
          const row: Row = {
            caseId: c.id,
            success: false,
            absoluteError: null,
            historicalOutcomeMinutes: c.waitMinutes,
            at: new Date().toISOString(),
          };
          try {
            const out = await callWaitModel(
              forecastPayload(
                c.symptoms,
                c.condition,
                { hour: c.hour, weekday: c.weekday, month: c.month },
                [c.siteId],
              ),
              'off',
            );
            const e = out.answer.estimates[0];
            Object.assign(row, {
              success: true,
              receipt: out.receipt,
              answer: out.answer,
              usage: out.usage,
              absoluteError: e ? Math.abs(e.estimateMinutes - c.waitMinutes) : null,
              covered: e ? c.waitMinutes >= e.lowMinutes && c.waitMinutes <= e.highMinutes : false,
            });
          } catch (e) {
            row.error = (e as Error).message;
            stopped = true;
          }
          run.rows.push(row);
          run.summary = urgentSummary(run.rows);
          save(join(runs, run.id + '.json'), run);
        }
        run.status = stopped ? 'stopped' : 'complete';
      } catch (e) {
        run.status = 'failed';
        run.error = (e as Error).message;
      } finally {
        run.finishedAt = new Date().toISOString();
        save(join(runs, run.id + '.json'), run);
        active = null;
      }
    })();
  });
  app.post('/api/staff/urgent-care/stop', (_req, res) => {
    stopped = true;
    training?.kill('SIGTERM');
    res.json({ stopping: !!active || !!training });
  });
}
