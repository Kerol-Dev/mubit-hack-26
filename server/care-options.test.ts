import test from 'node:test';
import assert from 'node:assert/strict';
import { departments, filterDepartments } from '../shared/departments';
import {
  preferenceSchema,
  applyCarePreference,
  consultationFee,
  clinicianFunding,
} from './care-options';
import { clinicians } from './data';
import type { Decision } from '../shared/types';
const base: Decision = {
  route: 'physio',
  summary: 'Concern',
  reason: 'Reason',
  nextStep: 'Next',
  safetyNet: 'Safety',
  needsReview: false,
  source: 'mubit',
};
test('directory supports concern search and combined access/funding filters', () => {
  assert.equal(departments.length, 34);
  assert.equal(new Set(departments.map((d) => d.id)).size, 34);
  assert.ok(filterDepartments('knee').some((d) => d.id === 'physio'));
  assert.ok(
    filterDepartments('anxiety', 'All services', 'NHS', 'Self-referral').some(
      (d) => d.id === 'talking',
    ),
  );
  assert.equal(filterDepartments('anxiety', 'All services', 'Private', 'Self-referral').length, 0);
});
test('invalid or unavailable care preferences are rejected', () => {
  assert.throws(() => preferenceSchema.parse({ departmentId: 'missing', funding: 'NHS' }));
  assert.throws(() => preferenceSchema.parse({ departmentId: 'pharmacy', funding: 'Private' }));
  assert.deepEqual(preferenceSchema.parse({ departmentId: 'physio', funding: 'Private' }), {
    departmentId: 'physio',
    funding: 'Private',
  });
});
test('private preference cannot override urgent or emergency routing', () => {
  for (const route of ['urgent', 'emergency'] as const) {
    const d = { ...base, route, needsReview: true };
    assert.equal(applyCarePreference(d, { departmentId: 'cardiology', funding: 'Private' }), d);
  }
});
test('self-referrals and children require review instead of automatic booking', () => {
  for (const departmentId of ['talking', 'children']) {
    const d = applyCarePreference(base, { departmentId, funding: 'NHS' });
    assert.equal(d.route, 'review');
    assert.equal(d.needsReview, true);
  }
});
test('specialist intent cannot incorrectly book a primary physiotherapy slot', () => {
  const d = applyCarePreference(base, { departmentId: 'cardiology', funding: 'Private' });
  assert.equal(d.route, 'review');
  const gp = { ...base, route: 'gp' as const };
  assert.equal(applyCarePreference(gp, { departmentId: 'cardiology', funding: 'NHS' }), gp);
});
test('private consultation fees come from configured clinician records', () => {
  assert.equal(consultationFee(clinicians.find((c) => c.id === 'olivia-private')), 65);
  assert.equal(consultationFee(clinicians.find((c) => c.id === 'olivia')), 0);
  assert.equal(clinicianFunding(clinicians.find((c) => c.id === 'amara')), 'NHS');
  assert.ok(
    clinicians
      .filter((c) => c.funding === 'Private')
      .every((c) => typeof c.feeGbp === 'number' && c.feeGbp > 0),
  );
});
