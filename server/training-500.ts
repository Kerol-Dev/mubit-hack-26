import { expandedTraining } from './training-expansion';
import { history } from './data';
import { unseenCases, hash } from './benchmark-data';
import { intakeSchema } from './navigation';
import type { Route } from '../shared/types';

// Synthetic TRAINING augmentation only. These are variations of authored training
// scenarios, not independent clinical records and not examples drawn from exams.
// Context changes are deliberately visible to the teacher; expected is QA only.
const contexts = [
  {
    name: 'young-adult',
    age: 23,
    pregnant: false,
    conditions: 'None reported',
    medications: 'None reported',
    text: 'I am 23. I have no long-term conditions and take no regular medicines.',
  },
  {
    name: 'older-adult',
    age: 72,
    pregnant: false,
    conditions: 'Stable hypertension',
    medications: 'A regular prescribed blood pressure tablet',
    text: 'I am 72 and take a prescribed tablet for stable high blood pressure. My usual health has otherwise been unchanged.',
  },
  {
    name: 'pregnancy',
    age: 31,
    pregnant: true,
    conditions: 'Pregnant, 20 weeks',
    medications: 'Prenatal vitamins',
    text: 'I am 31 and twenty weeks pregnant. I take prenatal vitamins. Please take the pregnancy into account when suggesting where I should go.',
  },
  {
    name: 'adolescent',
    age: 16,
    pregnant: false,
    conditions: 'None reported',
    medications: 'None reported',
    text: 'I am 16 and my parent is helping me complete this request. I have no known long-term conditions.',
  },
  {
    name: 'complex-history',
    age: 52,
    pregnant: false,
    conditions: 'Diabetes and chronic kidney disease',
    medications: 'Regular medicines prescribed by my specialist; list available to the practice',
    text: 'I am 52 and have diabetes and chronic kidney disease. I take regular prescribed medicines and the practice has my current list.',
  },
];
export const training500 = expandedTraining.flatMap((base, index) => {
  // Do not rewrite an explicitly pregnant, immunosuppressed or under-18 source
  // as a healthy adult; that would create contradictory teaching inputs.
  if (base.input.pregnant || base.input.age < 18 || base.input.conditions !== 'None reported')
    return [];
  return contexts.map((ctx, v) => {
    let expected: Route = base.expected;
    if (!['urgent', 'emergency'].includes(expected)) {
      if (ctx.age < 18) expected = 'review';
      else if (ctx.pregnant || ctx.name === 'complex-history')
        expected = expected === 'review' ? 'review' : 'gp';
    }
    const input = intakeSchema.parse({
      ...base.input,
      ...Object.fromEntries(
        Object.entries(ctx).filter(([k]) =>
          ['age', 'pregnant', 'conditions', 'medications'].includes(k),
        ),
      ),
      symptoms: base.input.symptoms + '\n\n' + ctx.text,
    });
    return {
      id: `T3-${String(index + 1).padStart(3, '0')}-${v}`,
      topic: `${base.topic}: ${ctx.name}`,
      split: 'training' as const,
      expected,
      input,
      inputHash: hash(input),
      synthetic: true,
      sourceFamily: base.id,
      augmentation: ctx.name,
    };
  });
});
const seen = new Set([...history, ...unseenCases(), ...expandedTraining].map((c) => hash(c.input)));
for (const c of training500) {
  if (seen.has(c.inputHash)) throw new Error(`Duplicate or evaluation overlap: ${c.id}`);
  seen.add(c.inputHash);
}
