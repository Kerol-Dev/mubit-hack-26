import type { Route } from './types';
export type Funding = 'NHS' | 'Private';
export type CarePreference = { departmentId: string; funding: Funding };
export type Department = {
  id: string;
  name: string;
  description: string;
  group: string;
  area: string;
  access: 'Direct care' | 'GP referral' | 'Self-referral' | 'Immediate help';
  route: Route;
  hours: string;
  funding: Funding[];
  tags: string[];
  nextStep: string;
  eligibility: string;
  source?: string;
};
const specialist = (
  id: string,
  name: string,
  description: string,
  group: string,
  tags: string[],
): Department => ({
  id,
  name,
  description,
  group,
  tags,
  area: 'Willowbrook specialist outpatient centre',
  access: 'GP referral',
  route: 'gp',
  hours: 'Appointments following clinical review',
  funding: ['NHS', 'Private'],
  nextStep:
    'Start with a GP review. If a referral is appropriate, discuss the specialist team and your NHS or private preference. This portal books the initial review, not a specialist appointment.',
  eligibility:
    'Referral requirements, insurance cover and availability must be checked with the service. Private care does not replace urgent or emergency help.',
  source: 'https://www.nhs.uk/nhs-services/hospitals/referrals-for-specialist-care/',
});
const community = (
  id: string,
  name: string,
  description: string,
  group: string,
  tags: string[],
  source: string,
  eligibility: string,
): Department => ({
  id,
  name,
  description,
  group,
  tags,
  area: 'Local community services',
  access: 'Self-referral',
  route: 'review',
  hours: 'Local service opening hours vary',
  funding: ['NHS'],
  source,
  eligibility,
  nextStep:
    'Check the official service information for local eligibility and self-referral. You can also send a request to your practice team for help finding the right service. No referral is submitted to the NHS by this demo.',
});
export const departments: Department[] = [
  {
    id: 'primary',
    name: 'GP & everyday health',
    description: 'New symptoms, ongoing concerns, test results and advice on the right next step.',
    group: 'Everyday care',
    area: 'Willowbrook Medical Centre',
    access: 'Direct care',
    route: 'gp',
    hours: 'Mon–Fri · 08:00–18:30',
    funding: ['NHS', 'Private'],
    tags: ['doctor', 'fatigue', 'headache', 'general practice'],
    nextStep:
      'Describe your concern first. After a suitable care recommendation, choose a GP and an available time.',
    eligibility:
      'Fictional adult GP appointments. NHS-style appointments have no consultation fee in this demo; private fees are displayed before confirmation.',
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy & minor illness',
    description: 'Advice for common conditions, medicines and Pharmacy First eligibility.',
    group: 'Everyday care',
    area: 'Willowbrook Community Pharmacy',
    access: 'Direct care',
    route: 'pharmacy',
    hours: 'Mon–Sat · 09:00–17:00',
    funding: ['NHS'],
    tags: [
      'sore throat',
      'sinusitis',
      'earache',
      'UTI',
      'shingles',
      'impetigo',
      'insect bites',
      'allergy',
    ],
    nextStep:
      'Tell us about your symptoms. Pharmacy First covers specified conditions when age and clinical criteria are met; the pharmacist assesses suitability.',
    eligibility:
      'Pharmacy First is an England service. Age ranges and exclusions vary by condition. Medicine or prescription charges may apply.',
    source: 'https://www.england.nhs.uk/primary-care/pharmacy/pharmacy-services/pharmacy-first/',
  },
  {
    id: 'nursing',
    name: 'Nursing & planned care',
    description:
      'Planned blood pressure checks, wound reviews and care already arranged by your clinician.',
    group: 'Everyday care',
    area: 'Willowbrook treatment rooms',
    access: 'Direct care',
    route: 'nurse',
    hours: 'Mon–Fri · 09:00–17:00',
    funding: ['NHS', 'Private'],
    tags: ['blood pressure', 'dressings', 'routine', 'nurse'],
    nextStep:
      'Tell us which planned review your clinician has requested. New or unexplained symptoms need a suitable clinical assessment first.',
    eligibility:
      'For planned care. Specific tests, vaccinations and procedures need a clinician’s assessment or order.',
  },
  {
    id: 'physio',
    name: 'Physiotherapy & MSK',
    description: 'Muscle, joint, back and movement concerns, with a first-contact physiotherapist.',
    group: 'Movement & rehabilitation',
    area: 'Willowbrook therapy suite',
    access: 'Direct care',
    route: 'physio',
    hours: 'Mon–Fri · 09:00–18:00',
    funding: ['NHS', 'Private'],
    tags: ['shoulder', 'back', 'knee', 'joint', 'neck', 'sports injury'],
    nextStep:
      'Describe your symptoms and complete the safety check. If suitable, choose an NHS-style or private physiotherapy visit.',
    eligibility:
      'Community MSK self-referral availability varies locally in England. Urgent injuries and emergency symptoms need a different pathway.',
    source: 'https://www.nhs.uk/nhs-services/get-nhs-help-for-back-joint-problems/',
  },
  community(
    'talking',
    'Talking therapies',
    'Support for anxiety, low mood and depression, including self-referral options.',
    'Mental health & wellbeing',
    ['anxiety', 'depression', 'stress', 'CBT', 'counselling'],
    'https://www.nhs.uk/tests-and-treatments/talking-therapies/',
    'NHS Talking Therapies in England usually accepts people aged 18+ registered with a GP; some services accept 16–17-year-olds. This is not an emergency service.',
  ),
  community(
    'sexual',
    'Sexual health & STI testing',
    'Confidential advice, sexual health testing and local clinic information.',
    'Family & reproductive health',
    ['STI', 'sexual health', 'HIV', 'testing'],
    'https://www.nhs.uk/nhs-services/sexual-health-services/',
    'Local sexual health services can generally be contacted directly. Clinic eligibility and appointment arrangements vary.',
  ),
  community(
    'contraception',
    'Contraception',
    'Explore contraception advice and local sexual health services.',
    'Family & reproductive health',
    ['pill', 'coil', 'implant', 'contraception'],
    'https://www.nhs.uk/contraception/',
    'Different options need different assessments. Ask a pharmacist or local sexual health service about time-sensitive emergency contraception.',
  ),
  community(
    'maternity',
    'Pregnancy & maternity',
    'Find maternity self-referral information and support for a new pregnancy.',
    'Family & reproductive health',
    ['pregnant', 'midwife', 'antenatal', 'pregnancy'],
    'https://www.nhs.uk/pregnancy/finding-out/your-first-midwife-appointment/',
    'Maternity access depends on your local service. New pain, bleeding or acute concerns need prompt clinical advice, not a routine referral form.',
  ),
  community(
    'dental',
    'Dental care',
    'Find a dentist for routine checks, dental pain and ongoing oral health.',
    'Eyes, ears & dental',
    ['tooth', 'teeth', 'dentist', 'gum'],
    'https://www.nhs.uk/nhs-services/dentists/',
    'Dental care has separate registration and charging rules. For urgent dental problems, follow NHS urgent dental guidance or contact NHS 111.',
  ),
  community(
    'eyes',
    'Optometry & eye care',
    'Routine sight tests and information about local opticians and eye services.',
    'Eyes, ears & dental',
    ['vision', 'glasses', 'optician', 'eye test'],
    'https://www.nhs.uk/nhs-services/opticians/',
    'NHS sight-test eligibility varies. Sudden vision loss or a painful red eye needs urgent assessment.',
  ),
  specialist(
    'cardiology',
    'Cardiology',
    'Assessment of ongoing heart-related concerns after primary care review.',
    'Specialist clinics',
    ['heart', 'palpitations', 'cardiology'],
  ),
  specialist(
    'dermatology',
    'Dermatology',
    'Specialist support for persistent skin, hair and nail conditions.',
    'Specialist clinics',
    ['skin', 'eczema', 'psoriasis', 'mole', 'acne'],
  ),
  specialist(
    'respiratory',
    'Respiratory medicine',
    'Lung and breathing conditions that need specialist assessment.',
    'Specialist clinics',
    ['lung', 'asthma', 'COPD', 'breathing'],
  ),
  specialist(
    'gastro',
    'Gastroenterology',
    'Specialist assessment of persistent digestive health concerns.',
    'Specialist clinics',
    ['stomach', 'bowel', 'gut', 'digestion'],
  ),
  specialist(
    'neurology',
    'Neurology',
    'Specialist review of conditions affecting the brain and nervous system.',
    'Specialist clinics',
    ['neurology', 'migraine', 'nerves'],
  ),
  specialist(
    'ent',
    'Ear, nose & throat',
    'Specialist assessment of ongoing ear, nose, throat and balance concerns.',
    'Eyes, ears & dental',
    ['ear', 'nose', 'throat', 'sinus', 'balance'],
  ),
  specialist(
    'audiology',
    'Audiology & hearing',
    'Hearing assessment and a discussion of suitable support.',
    'Eyes, ears & dental',
    ['hearing', 'tinnitus', 'hearing aid'],
  ),
  specialist(
    'ophthalmology',
    'Ophthalmology',
    'Consultant eye care following an appropriate clinical referral.',
    'Eyes, ears & dental',
    ['cataract', 'glaucoma', 'eye specialist'],
  ),
  specialist(
    'orthopaedics',
    'Orthopaedics',
    'Bone and joint conditions requiring specialist review.',
    'Movement & rehabilitation',
    ['bone', 'hip', 'knee', 'orthopaedic'],
  ),
  specialist(
    'rheumatology',
    'Rheumatology',
    'Specialist review of inflammatory joint and related conditions.',
    'Movement & rehabilitation',
    ['arthritis', 'inflammation', 'rheumatoid'],
  ),
  specialist(
    'podiatry',
    'Podiatry & foot health',
    'Foot and lower-limb concerns, with access based on clinical need.',
    'Movement & rehabilitation',
    ['feet', 'foot', 'podiatrist', 'heel'],
  ),
  specialist(
    'rehab',
    'Rehabilitation & pain support',
    'Coordinated support for recovery, persistent pain and everyday function.',
    'Movement & rehabilitation',
    ['rehabilitation', 'pain', 'recovery', 'occupational therapy'],
  ),
  specialist(
    'women',
    'Gynaecology & women’s health',
    'Discuss pelvic health, menstrual concerns and specialist review.',
    'Family & reproductive health',
    ['period', 'pelvic', 'gynaecology', 'women'],
  ),
  specialist(
    'menopause',
    'Menopause support',
    'An individual GP discussion about symptoms and available support.',
    'Family & reproductive health',
    ['menopause', 'perimenopause', 'HRT'],
  ),
  specialist(
    'urology',
    'Urology',
    'Specialist support for ongoing urinary and urological concerns.',
    'Specialist clinics',
    ['bladder', 'urinary', 'prostate', 'urology'],
  ),
  specialist(
    'endocrine',
    'Diabetes & endocrinology',
    'Review of diabetes, thyroid and other hormonal conditions.',
    'Long-term health',
    ['diabetes', 'thyroid', 'hormone', 'endocrine'],
  ),
  specialist(
    'dietetic',
    'Dietetics & nutrition',
    'Dietary support connected to a health condition or treatment plan.',
    'Long-term health',
    ['diet', 'nutrition', 'dietitian', 'weight'],
  ),
  specialist(
    'renal',
    'Kidney medicine',
    'Specialist assessment and monitoring of kidney conditions.',
    'Long-term health',
    ['kidney', 'renal'],
  ),
  {
    ...specialist(
      'children',
      'Children & young people',
      'Requests for under-18s are reviewed by the practice care team.',
      'Family & reproductive health',
      ['child', 'baby', 'paediatric', 'teen'],
    ),
    route: 'review',
    eligibility:
      'Under-18 requests are reviewed by a person. This adult navigation demo does not automatically book paediatric care.',
  },
  {
    ...specialist(
      'wellbeing',
      'Mental health review',
      'A GP discussion for ongoing concerns or when you are unsure which support fits.',
      'Mental health & wellbeing',
      ['mental health', 'sleep', 'wellbeing'],
    ),
    nextStep:
      'Describe your concern for a GP or practice-team review. Talking therapies also has a separate self-referral information pathway.',
  },
  community(
    'smoking',
    'Stop smoking support',
    'Find local support to help you stop smoking.',
    'Mental health & wellbeing',
    ['smoking', 'tobacco', 'quit'],
    'https://www.nhs.uk/better-health/quit-smoking/',
    'Local support and access arrangements vary. Ask your practice or pharmacist about what is available.',
  ),
  community(
    'social',
    'Community & social support',
    'Help finding practical support for isolation, activity and daily wellbeing.',
    'Mental health & wellbeing',
    ['loneliness', 'social prescribing', 'community', 'carer'],
    'https://www.england.nhs.uk/personalisedcare/social-prescribing/',
    'Availability depends on local services. Ask the practice about social prescribing and community support.',
  ),
  {
    id: 'travel',
    name: 'Travel health',
    description: 'Discuss travel vaccinations and health advice before a trip.',
    group: 'Everyday care',
    area: 'Willowbrook treatment rooms',
    access: 'GP referral',
    route: 'gp',
    hours: 'Pre-travel clinical review',
    funding: ['NHS', 'Private'],
    tags: ['travel', 'vaccine', 'vaccination'],
    nextStep:
      'Tell the care team where and when you plan to travel. Vaccines and appointments are confirmed after an individual assessment.',
    eligibility:
      'Some travel vaccines may be available on the NHS; others are paid for privately. Availability and cost must be confirmed.',
    source: 'https://www.nhs.uk/vaccinations/travel-vaccinations/',
  },
  {
    id: 'urgent',
    name: 'Urgent & emergency help',
    description: 'Know when to get help now rather than waiting for a routine appointment.',
    group: 'Urgent help',
    area: 'NHS urgent and emergency services',
    access: 'Immediate help',
    route: 'urgent',
    hours: '24 hours',
    funding: ['NHS'],
    tags: ['urgent', 'emergency', '111', '999'],
    nextStep:
      'For a life-threatening emergency call 999. For urgent help that is not an emergency, contact NHS 111. Do not wait for this demo.',
    eligibility:
      'The portal is a fictional demonstration and cannot deliver urgent or emergency care.',
    source: 'https://111.nhs.uk/',
  },
];
export function findDepartment(id?: string) {
  return departments.find((d) => d.id === id);
}
export function filterDepartments(
  query: string,
  group = 'All services',
  funding = 'All care',
  access = 'Any access',
) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return departments.filter(
    (d) =>
      (group === 'All services' || d.group === group) &&
      (funding === 'All care' || d.funding.includes(funding as Funding)) &&
      (access === 'Any access' || d.access === access) &&
      words.every((word) =>
        [d.name, d.description, ...d.tags].join(' ').toLowerCase().includes(word),
      ),
  );
}
