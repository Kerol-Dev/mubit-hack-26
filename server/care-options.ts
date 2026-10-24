import { z } from 'zod';
import { findDepartment, type CarePreference } from '../shared/departments';
import type { Decision, Clinician } from '../shared/types';
export const preferenceSchema = z
  .object({ departmentId: z.string(), funding: z.enum(['NHS', 'Private']) })
  .refine(
    (p) => findDepartment(p.departmentId)?.funding.includes(p.funding),
    'Choose an available care option.',
  );
export function applyCarePreference(decision: Decision, preference?: CarePreference): Decision {
  const department = findDepartment(preference?.departmentId);
  if (!department || ['urgent', 'emergency'].includes(decision.route)) return decision;
  if (
    department.access === 'Self-referral' ||
    department.route === 'review' ||
    (department.access === 'GP referral' && !['gp', 'review'].includes(decision.route))
  )
    return {
      ...decision,
      route: 'review',
      needsReview: true,
      source: 'safety',
      reason:
        'This service needs an individual practice-team review before a referral or appointment.',
      nextStep:
        'Your practice team will review your request and help with the appropriate service.',
    };
  return decision;
}
export const clinicianFunding = (c: Clinician | undefined) => c?.funding || 'NHS';
export const consultationFee = (c: Clinician | undefined) =>
  clinicianFunding(c) === 'Private' ? (c?.feeGbp ?? null) : 0;
