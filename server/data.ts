import type { Clinician, HistoricalCase, Intake, Route } from '../shared/types';
export const clinicians: Clinician[] = [
  {
    id: 'amara',
    name: 'Dr Amara Wilson',
    role: 'gp',
    title: 'General practitioner',
    initials: 'AW',
    color: 'peach',
    bio: 'General practice, with a special interest in women’s health and long-term wellbeing.',
    languages: ['English', 'French'],
    location: 'Willowbrook Medical Centre',
  },
  {
    id: 'james',
    name: 'Dr James Chen',
    role: 'gp',
    title: 'General practitioner',
    initials: 'JC',
    color: 'blue',
    bio: 'Everyday health concerns, preventative care and ongoing support.',
    languages: ['English', 'Mandarin'],
    location: 'Willowbrook Medical Centre',
  },
  {
    id: 'sarah',
    name: 'Sarah Williams',
    role: 'nurse',
    title: 'Practice nurse',
    initials: 'SW',
    color: 'lilac',
    bio: 'Routine health checks, blood pressure reviews and planned nursing care.',
    languages: ['English'],
    location: 'Willowbrook Medical Centre',
  },
  {
    id: 'ravi',
    name: 'Ravi Shah',
    role: 'pharmacy',
    title: 'Clinical pharmacist',
    initials: 'RS',
    color: 'sage',
    bio: 'Common conditions, medicine reviews and practical advice close to home.',
    languages: ['English', 'Gujarati'],
    location: 'Willowbrook Community Pharmacy',
  },
  {
    id: 'olivia',
    name: 'Olivia Brooks',
    role: 'physio',
    title: 'First-contact physiotherapist',
    initials: 'OB',
    color: 'sand',
    bio: 'Helping you move comfortably, with advice for muscle and joint concerns.',
    languages: ['English'],
    location: 'Willowbrook Medical Centre',
  },
];
export const patient = {
  name: 'Maya Patel',
  firstName: 'Maya',
  initials: 'MP',
  dob: '1997-05-18',
  age: 29,
  email: 'maya.patel@example.test',
  address: '14 Willow Lane, London · Fictional address',
};
export const practice = {
  name: 'Willowbrook Medical Centre',
  address: '22 Willow Lane, London W6 · Fictional practice',
  hours: 'Monday–Friday, 08:00–18:30',
};
const topics: { topic: string; route: Route; descriptions: string[] }[] = [
  {
    topic: 'Sore throat',
    route: 'pharmacy',
    descriptions: [
      'My throat has been a little sore for two days. I can swallow food and water normally and otherwise feel well.',
      'I have a mild sore throat and a runny nose. No breathing problems, no high fever and I can drink normally.',
      'My throat feels scratchy since yesterday. It is mild and I have no difficulty swallowing.',
    ],
  },
  {
    topic: 'Seasonal allergy',
    route: 'pharmacy',
    descriptions: [
      'My eyes are itchy and I keep sneezing when I go outside. This happens every spring. I am breathing normally.',
      'I have my usual mild hay fever. I would like advice on suitable medicines.',
      'Pollen seems to be making my nose run. I am otherwise well and would like a pharmacist’s advice.',
    ],
  },
  {
    topic: 'Mild skin irritation',
    route: 'pharmacy',
    descriptions: [
      'There is a small itchy patch on my arm after trying a new soap. No swelling of my lips or breathing difficulty.',
      'My hands are a little dry and itchy. No broken skin, fever or rapidly spreading rash.',
      'I have a mild itchy insect bite on my leg, without fever or swelling elsewhere.',
    ],
  },
  {
    topic: 'Ongoing tiredness',
    route: 'gp',
    descriptions: [
      'I have been unusually tired for six weeks even after sleeping. I would like to discuss it.',
      'For the last month I have felt low in energy. I am able to do my normal activities but it is not improving.',
      'I have felt more tired than usual for several weeks and would like a GP review.',
    ],
  },
  {
    topic: 'Recurring headaches',
    route: 'gp',
    descriptions: [
      'I have mild headaches a few times a week for a month. They come on gradually, with no weakness, fever or vision changes.',
      'For several weeks I have had occasional mild headaches after work. They are not sudden or severe.',
      'I would like to discuss recurring mild headaches. They have not suddenly changed and I have no other symptoms.',
    ],
  },
  {
    topic: 'Routine blood pressure review',
    route: 'nurse',
    descriptions: [
      'My GP asked me to arrange my routine blood pressure check. I have no new symptoms.',
      'I am due my scheduled blood pressure follow-up with the practice nurse. I feel well.',
      'I need to book the planned blood pressure review from my last appointment. No symptoms today.',
    ],
  },
  {
    topic: 'Routine care check',
    route: 'nurse',
    descriptions: [
      'The practice invited me for a routine health check. I feel well and need an appointment.',
      'I am due a planned review with the nurse and have no new health concerns.',
      'My clinician asked me to book a routine nursing appointment to review my existing care plan.',
    ],
  },
  {
    topic: 'Muscle discomfort',
    route: 'physio',
    descriptions: [
      'My shoulder feels stiff after desk work for three weeks. No injury, chest pain, fever, weakness or numbness.',
      'I have mild shoulder stiffness from working at a desk. It improves when I move and I have no other symptoms.',
      'My neck feels a little stiff after long desk days. There was no injury and I have no fever, headache or arm weakness.',
    ],
  },
  {
    topic: 'Knee discomfort',
    route: 'physio',
    descriptions: [
      'My knee aches mildly after running. I can walk normally, there is no swelling, redness or injury.',
      'I get mild knee discomfort when jogging. No injury or swelling, and I can bear weight normally.',
      'My knee feels a bit stiff after exercise. It is not hot or swollen and there has been no injury.',
    ],
  },
  {
    topic: 'Specialist request',
    route: 'gp',
    descriptions: [
      'I would like to discuss a cardiology referral because of a family history. I do not have any symptoms now.',
      'Could I discuss whether I need a dermatology referral for an ongoing skin problem? No urgent changes.',
      'I would like to talk to my GP about whether a specialist review is appropriate for my ongoing symptoms.',
    ],
  },
  {
    topic: 'Urgent worsening symptoms',
    route: 'urgent',
    descriptions: [
      'My abdominal pain has been getting worse today and I feel feverish. I am not sure whether I can wait.',
      'I have a new fever and I am feeling much worse today. I need advice about where to get help.',
      'I feel increasingly unwell with pain and a fever today. I need to know how to get same-day help.',
    ],
  },
  {
    topic: 'Emergency symptoms',
    route: 'emergency',
    descriptions: [
      'I have sudden crushing chest pain spreading to my arm and I feel sweaty and short of breath.',
      'I am struggling to breathe and cannot finish a sentence.',
      'One side of my face has suddenly drooped and my speech is slurred.',
    ],
  },
];
export const history: HistoricalCase[] = Array.from({ length: 120 }, (_, i) => {
  const t = topics[i % topics.length];
  const input: Intake = {
    symptoms: t.descriptions[Math.floor(i / topics.length) % 3],
    duration:
      t.route === 'emergency'
        ? 'Just now'
        : t.route === 'urgent'
          ? 'Today'
          : ['2 days', '1 week', '3 weeks', '6 weeks'][i % 4],
    severity: t.route === 'emergency' || t.route === 'urgent' ? 'severe' : 'mild',
    age: 20 + ((i * 7) % 49),
    pregnant: false,
    conditions: 'None reported',
    medications: 'None reported',
    redFlags: t.route === 'emergency' ? ['Emergency symptoms reported'] : [],
    goal: [
      'Advice and an appointment if needed',
      'Find the right person to speak to',
      'Understand my next step',
    ][i % 3],
    consent: true,
  };
  return {
    id: `H-${String(i + 1).padStart(3, '0')}`,
    topic: t.topic,
    expected: t.route,
    input,
    split: i < 100 ? 'training' : 'evaluation',
  };
});

// These specialist requests are for GP assessment, not automatic specialist booking.
const specialistExamples: [string, string, Route][] = [
  [
    'Cardiology referral',
    'I feel well today. My parent has a heart condition and I would like to ask my GP whether family screening or a cardiology referral is appropriate.',
    'gp',
  ],
  [
    'Dermatology referral',
    'My existing eczema keeps returning despite the plan from my clinician. I have no fever or sudden change. Could I discuss a dermatology referral?',
    'gp',
  ],
  [
    'Respiratory follow-up',
    'I have an established asthma diagnosis and want a planned review of my long-term treatment. I am breathing normally and have no new symptoms today.',
    'gp',
  ],
  [
    'Gastroenterology referral',
    'I have had mild recurring digestive discomfort for several months. No sudden pain, bleeding or vomiting. I would like to discuss specialist assessment with my GP.',
    'gp',
  ],
  [
    'Women’s health',
    'I would like a routine appointment to discuss symptoms around the menopause and whether a specialist clinic would help. I have no urgent concerns.',
    'gp',
  ],
  [
    'Wellbeing review',
    'I have been worrying more over the last month and it is affecting my sleep. I am not at risk of harming myself. I would like to discuss support with my GP.',
    'gp',
  ],
  [
    'Specialist letter',
    'My consultant asked me to discuss their follow-up letter with my GP. I am well at the moment and have no new symptoms.',
    'gp',
  ],
  [
    'Referral discussion',
    'I want to ask whether an ongoing stable condition needs a hospital referral. Nothing has suddenly changed and I would like a routine GP review.',
    'gp',
  ],
  [
    'Insufficient detail',
    'I need help because something does not feel right, but I have not described the symptom or how long it has been happening.',
    'review',
  ],
  [
    'Children’s care',
    'I am entering this request for my 12-year-old child who has a mild ongoing skin concern. They are otherwise well.',
    'review',
  ],
  [
    'Pregnancy review',
    'I am pregnant and want advice about an ongoing mild skin irritation. I am otherwise well with no fever or new pain.',
    'gp',
  ],
  [
    'Complex care',
    'I take medicines that suppress my immune system and have a new sore throat. I would like the practice team to assess what to do.',
    'review',
  ],
];
for (let n = 0; n < 24; n++) {
  const [topic, text, route] = specialistExamples[n % 12],
    h = history[76 + n];
  h.topic = topic;
  h.expected = route;
  h.input = {
    ...h.input,
    symptoms:
      text +
      (n >= 12 ? ' I would prefer to discuss the options before arranging any referral.' : ''),
    duration: 'Routine / planned care',
    severity: 'mild',
    age: n % 12 === 9 ? 12 : 35 + n,
    pregnant: n % 12 === 10,
    redFlags: [],
    conditions: n % 12 === 11 ? 'Immunosuppression reported' : 'None reported',
    medications: n % 12 === 11 ? 'Immunosuppressive medicines' : 'None reported',
  };
}
// Separate wording and cases for later evaluation. These are never recorded for training.
const reserved: [string, Route, string][] = [
  [
    'Pharmacy advice',
    'pharmacy',
    'My usual pollen allergy started this morning: a runny nose and sneezing, but I am otherwise fine and breathing comfortably. Could I ask about allergy medicines?',
  ],
  [
    'Minor bite',
    'pharmacy',
    'A single mosquito bite on my calf is mildly itchy. I have no fever, spreading redness or swelling elsewhere and want advice on itching.',
  ],
  [
    'Dry skin advice',
    'pharmacy',
    'My hands became dry after using detergent. There is no broken skin or infection. I want advice on a moisturiser.',
  ],
  [
    'Persistent fatigue',
    'gp',
    'Over eight weeks I have needed far more sleep and still feel tired. It is not a sudden change, but I want to understand why.',
  ],
  [
    'Routine GP concern',
    'gp',
    'For two months I have had mild gradual headaches once or twice weekly. No sudden severe pain, fever, weakness or altered vision. Please arrange a review.',
  ],
  [
    'Nursing monitoring',
    'nurse',
    'The nurse sent me an invitation to have my scheduled blood pressure measured. I have no symptoms and am arranging the requested check.',
  ],
  [
    'Planned care',
    'nurse',
    'I need the planned nursing follow-up that is already in my care plan. I have no new concerns.',
  ],
  [
    'Shoulder movement',
    'physio',
    'Typing all day leaves my shoulder slightly tight. It has been happening for several weeks and eases when I stretch. No injury, chest symptoms, weakness or numbness.',
  ],
  [
    'Running discomfort',
    'physio',
    'After longer runs I notice a minor ache in my knee. I walk normally, it is not swollen or hot, and I have not injured it.',
  ],
  [
    'Referral question',
    'gp',
    'A relative suggested a heart screening clinic. I have no symptoms now and want my GP to explain whether a referral is appropriate.',
  ],
  [
    'Skin specialist question',
    'gp',
    'I would like to review my longstanding stable skin condition and discuss whether a dermatologist should be involved. There have been no urgent changes.',
  ],
  [
    'Unclear concern',
    'review',
    'I would like to speak to someone about a health concern but have not provided any symptoms or context yet.',
  ],
  [
    'Child review',
    'review',
    'My 10-year-old needs advice on a minor ongoing concern. There are no urgent symptoms and I need the appropriate children’s care team.',
  ],
  [
    'Pregnancy care',
    'gp',
    'I am expecting a baby and have mild itchy skin. I have no other symptoms and want to ask a clinician what advice is suitable.',
  ],
  [
    'Sudden neurological concern',
    'emergency',
    'My partner’s speech suddenly became difficult to understand and one side of their face has dropped. This started minutes ago.',
  ],
  [
    'Severe breathing concern',
    'emergency',
    'I suddenly cannot get enough air and cannot speak in full sentences. I need immediate help.',
  ],
  [
    'Worsening illness',
    'urgent',
    'My stomach pain and fever have worsened through today and I feel increasingly unwell. I need advice today.',
  ],
  [
    'Planned respiratory care',
    'gp',
    'My established lung condition is stable. I would like my GP to review a specialist letter and discuss the next planned steps.',
  ],
  [
    'Wellbeing discussion',
    'gp',
    'I have been feeling persistently anxious and would like a non-urgent conversation about support. I have no thoughts of self-harm and am safe at the moment.',
  ],
  [
    'Long-term follow-up',
    'gp',
    'A hospital specialist recommended that I speak with my GP about a planned follow-up. I have no new symptoms and do not need urgent help.',
  ],
];
reserved.forEach(([topic, expected, symptoms], i) => {
  const h = history[100 + i];
  h.topic = topic;
  h.expected = expected;
  h.input = {
    ...h.input,
    symptoms,
    age: i === 12 ? 10 : 30 + i,
    pregnant: i === 13,
    duration: ['emergency', 'urgent'].includes(expected) ? 'Today' : '1–4 weeks',
    severity: ['emergency', 'urgent'].includes(expected) ? 'severe' : 'mild',
    redFlags: [],
    conditions: 'None reported',
    medications: 'None reported',
  };
});
