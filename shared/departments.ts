import type { Route } from './types';
export const departments: {
  id: string;
  name: string;
  description: string;
  area: string;
  access: 'Direct care' | 'GP referral' | 'Immediate help';
  route: Route;
  hours: string;
}[] = [
  {
    id: 'primary',
    name: 'General practice',
    description: 'New concerns, ongoing symptoms and your first step to specialist care.',
    area: 'Ground floor · Primary care',
    access: 'Direct care',
    route: 'gp',
    hours: 'Mon–Fri · 08:00–18:30',
  },
  {
    id: 'pharmacy',
    name: 'Community pharmacy',
    description: 'Advice on common conditions and everyday medicines.',
    area: 'Ground floor · Pharmacy',
    access: 'Direct care',
    route: 'pharmacy',
    hours: 'Mon–Sat · 09:00–17:00',
  },
  {
    id: 'nursing',
    name: 'Nursing & planned care',
    description: 'Routine checks and follow-up visits arranged by your care team.',
    area: 'Ground floor · Treatment rooms',
    access: 'Direct care',
    route: 'nurse',
    hours: 'Mon–Fri · 09:00–17:00',
  },
  {
    id: 'physio',
    name: 'Musculoskeletal care',
    description: 'Assessment and support for muscle, joint and movement concerns.',
    area: 'Ground floor · Therapy suite',
    access: 'Direct care',
    route: 'physio',
    hours: 'Mon–Fri · 09:00–17:00',
  },
  {
    id: 'cardiology',
    name: 'Cardiology',
    description:
      'Specialist assessment for heart-related conditions following a clinician referral.',
    area: 'Level 1 · Outpatient clinics',
    access: 'GP referral',
    route: 'gp',
    hours: 'Referral appointments only',
  },
  {
    id: 'dermatology',
    name: 'Dermatology',
    description: 'Specialist assessment of ongoing skin conditions after a GP review.',
    area: 'Level 1 · Outpatient clinics',
    access: 'GP referral',
    route: 'gp',
    hours: 'Referral appointments only',
  },
  {
    id: 'respiratory',
    name: 'Respiratory medicine',
    description: 'Specialist lung and breathing care following an appropriate referral.',
    area: 'Level 1 · Outpatient clinics',
    access: 'GP referral',
    route: 'gp',
    hours: 'Referral appointments only',
  },
  {
    id: 'gastro',
    name: 'Gastroenterology',
    description: 'Specialist digestive health assessment and continuing care.',
    area: 'Level 2 · Outpatient clinics',
    access: 'GP referral',
    route: 'gp',
    hours: 'Referral appointments only',
  },
  {
    id: 'women',
    name: 'Women’s health',
    description: 'A GP review to discuss the right service for your health concerns.',
    area: 'Level 2 · Outpatient clinics',
    access: 'GP referral',
    route: 'gp',
    hours: 'Referral appointments only',
  },
  {
    id: 'children',
    name: 'Children & young people',
    description: 'Requests for under-18s go to the care team for individual review.',
    area: 'Level 2 · Family care',
    access: 'GP referral',
    route: 'review',
    hours: 'Care team review required',
  },
  {
    id: 'wellbeing',
    name: 'Mental health & wellbeing',
    description: 'Speak with your GP about ongoing concerns and suitable support.',
    area: 'Level 2 · Wellbeing suite',
    access: 'GP referral',
    route: 'gp',
    hours: 'Care team review required',
  },
  {
    id: 'urgent',
    name: 'Urgent & emergency help',
    description: 'For real urgent advice, use NHS 111. In a life-threatening emergency, call 999.',
    area: 'External urgent care services',
    access: 'Immediate help',
    route: 'urgent',
    hours: 'Do not wait for a routine booking',
  },
];
