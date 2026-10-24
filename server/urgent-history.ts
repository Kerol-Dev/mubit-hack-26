import { urgentConditions, urgentSites } from '../shared/urgent-care';
import { createHash } from 'node:crypto';
export type WaitRecord = {
  id: string;
  arrival: string;
  siteId: string;
  condition: string;
  symptoms: string;
  hour: number;
  weekday: number;
  month: number;
  waitMinutes: number;
  split: 'history' | 'training' | 'evaluation';
  provenance: 'synthetic';
};
const phrases = [
  [
    'I twisted my ankle today. It is swollen and painful to walk on.',
    'I hurt my wrist after a fall and need it checked.',
    'My foot hurts and is swollen after a sports injury.',
  ],
  [
    'I cut my hand cooking. Bleeding has stopped but it may need dressing.',
    'I have a small burn on my forearm from a hot pan.',
    'I grazed my knee and the dressing needs attention.',
  ],
  [
    'A patch of skin has become red and sore today.',
    'A small wound looks inflamed and needs checking.',
    'I have a new itchy rash on one arm.',
  ],
  [
    'I have an earache that has become worse since yesterday.',
    'My throat is very sore but I can swallow fluids.',
    'My ear is painful and I would like it checked.',
  ],
  [
    'I feel unwell and would like advice about the right urgent service.',
    'My symptoms have changed today and I need an assessment.',
    'I have a new concern that cannot wait for my routine GP visit.',
  ],
];
// Reproducible fictional arrival-to-first-treating-clinician outcomes. NOT NHS patient records.
// No generated target or future outcome is passed in a prediction request.
let seed = 835129;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
export const waitHistory: WaitRecord[] = [];
for (let i = 0; i < 1800; i++) {
  const split = i < 1200 ? 'history' : i < 1700 ? 'training' : 'evaluation';
  const condition = Math.floor(random() * urgentConditions.length),
    site = Math.floor(random() * 3);
  const day = Math.floor(
    random() * (split === 'evaluation' ? 23 : split === 'training' ? 30 : 181),
  );
  const base =
    split === 'evaluation' ? '2026-10-01' : split === 'training' ? '2026-09-01' : '2026-03-01';
  const hour = site === 0 ? 8 + Math.floor(random() * 12) : Math.floor(random() * 24),
    minute = Math.floor(random() * 60);
  const date = new Date(base + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + day);
  const weekday = date.getUTCDay(),
    month = date.getUTCMonth() + 1;
  const load = hour >= 11 && hour <= 19 ? 28 : hour < 7 ? -12 : 5;
  const seasonal = month >= 9 ? 12 : 0;
  const wait = Math.max(
    10,
    Math.round(
      ([38, 68, 57][site] +
        load +
        (weekday === 0 || weekday === 6 ? 17 : 0) +
        [4, -5, 3, 0, 10][condition] +
        seasonal +
        (random() + random() + random() - 1.5) * 38) /
        5,
    ) * 5,
  );
  waitHistory.push({
    id: `UWH-${String(i + 1).padStart(4, '0')}`,
    arrival: `${date.toISOString().slice(0, 10)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    siteId: urgentSites[site].id,
    condition: urgentConditions[condition],
    symptoms: phrases[condition][i % 3],
    hour,
    weekday,
    month,
    waitMinutes: wait,
    split,
    provenance: 'synthetic',
  });
}
export const historyHash = createHash('sha256').update(JSON.stringify(waitHistory)).digest('hex');
export function cohort(siteId: string, condition: string, hour: number, weekday: number) {
  const pool = waitHistory.filter((x) => x.split === 'history' && x.siteId === siteId);
  const ranked = pool
    .map((x) => ({
      x,
      d:
        (x.condition === condition ? 0 : 5) +
        Math.min(Math.abs(x.hour - hour), 24 - Math.abs(x.hour - hour)) / 3 +
        ((x.weekday === 0 || x.weekday === 6) === (weekday === 0 || weekday === 6) ? 0 : 2),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 40)
    .map((v) => v.x.waitMinutes)
    .sort((a, b) => a - b);
  const q = (p: number) => ranked[Math.floor((ranked.length - 1) * p)];
  return {
    sampleSize: ranked.length,
    medianMinutes: q(0.5),
    p10Minutes: q(0.1),
    p90Minutes: q(0.9),
    source: 'synthetic historical encounters, March–August 2026',
  };
}
