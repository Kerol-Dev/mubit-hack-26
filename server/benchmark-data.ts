import { createHash } from 'node:crypto';
import type { Intake, Route } from '../shared/types';
import type { BenchmarkCase } from '../shared/benchmark';
// Authored separately from the teaching set. These labels are illustrative, not a clinical gold standard.
const scenarios: [Route, string, string, Partial<Intake>?][] = [
  [
    'pharmacy',
    'Dry lips',
    'My lips have become dry and flaky after walking in cold weather. No swelling, sores or other illness. What can I use?',
  ],
  [
    'pharmacy',
    'Travel sickness',
    'I feel queasy only on winding bus journeys, then completely normal when I get off. I want advice before a coach trip.',
  ],
  [
    'pharmacy',
    'Small graze',
    'I scraped a small patch of skin on my knee yesterday. It is clean, not deep or bleeding, and I can walk normally.',
  ],
  [
    'pharmacy',
    'Mild dandruff',
    'My scalp has mild white flakes and a little itch. No wounds, hair loss, pain or spreading redness. I want shampoo advice.',
  ],
  [
    'pharmacy',
    'Chapped hands',
    'Cold weather has made the skin on my knuckles dry. It is not bleeding, hot or swollen. I would like moisturiser advice.',
  ],
  [
    'pharmacy',
    'Insect bite',
    'A mosquito left a pea-sized itchy bump yesterday. It has not grown and I have no fever, facial swelling or breathing changes.',
  ],
  [
    'pharmacy',
    'Blocked nose',
    'I have a stuffy nose with a mild cold since yesterday. I am eating, drinking and breathing comfortably and otherwise well.',
  ],
  [
    'pharmacy',
    'Foot blister',
    'My new shoes rubbed one small intact blister on my heel. No diabetes, redness spreading, pus or fever.',
  ],
  [
    'pharmacy',
    'Seasonal sneezing',
    'Cutting the grass brings on my usual sneezing and itchy watery eyes. I feel well otherwise and have no wheeze.',
  ],
  [
    'pharmacy',
    'Mild sunburn',
    'My forearms are slightly pink after gardening. No blisters, sickness, fever or dizziness. I need advice on soothing the skin.',
  ],
  [
    'pharmacy',
    'Mouth ulcer',
    'I noticed one small mouth ulcer four days ago. I can eat and drink and have no other symptoms or immune conditions.',
  ],
  [
    'pharmacy',
    'Athlete foot advice',
    'The skin between two toes is mildly itchy and peeling. It is a small patch with no spreading redness or pain. I have no diabetes.',
  ],
  [
    'pharmacy',
    'Medicine information',
    'I am well but would like a pharmacist to explain the storage instructions on an unopened over-the-counter medicine.',
  ],
  [
    'pharmacy',
    'Minor constipation',
    'My stools have been a little hard for two days after changing my diet. No pain, vomiting, blood, bloating or other illness.',
  ],
  [
    'pharmacy',
    'Dry eyes',
    'My eyes feel mildly dry after screen use. No pain, redness, discharge or changes to vision. I do not wear contact lenses.',
  ],
  [
    'pharmacy',
    'Minor indigestion',
    'I had mild indigestion after one large spicy meal. It has gone now. No chest pain or other symptoms. I want general pharmacy advice.',
  ],
  [
    'gp',
    'Persistent cough',
    'I have a mild cough that has lasted five weeks. No breathlessness, blood, chest pain or fever, but it is not clearing.',
  ],
  [
    'gp',
    'Gradual hearing change',
    'I have gradually found conversation harder to hear over several months. No sudden loss, pain or discharge.',
  ],
  [
    'gp',
    'Sleep difficulty',
    'For two months I have struggled to fall asleep and feel tired at work. I want to discuss this with a doctor.',
  ],
  [
    'gp',
    'Digestive pattern',
    'My bowel habits have changed over six weeks. No severe pain, bleeding or vomiting. I would like a medical review.',
  ],
  [
    'gp',
    'Recurring mild rash',
    'The same mild skin rash keeps returning over three months. There is no fever or rapid spread. Cream advice has not settled it.',
  ],
  [
    'gp',
    'Changing mole',
    'A mole on my back has slowly changed shape over recent months. I feel well but want a clinician to examine it.',
  ],
  [
    'gp',
    'Specialist letter',
    'I received a dermatology letter asking my GP to arrange follow-up. I have no acute symptoms and need help understanding the next step.',
  ],
  [
    'gp',
    'Long-term joint symptoms',
    'Several finger joints have felt stiff each morning for two months. No injury, fever or sudden swelling.',
  ],
  [
    'gp',
    'Medication review',
    'My regular prescription is due a scheduled review with the GP. I feel well and have no new side effects.',
  ],
  [
    'gp',
    'Menopause discussion',
    'I want to discuss hot flushes and sleep changes that have built up over several months. No urgent symptoms.',
  ],
  [
    'gp',
    'Low mood',
    'I have felt low most days for six weeks and want support. I have no thoughts of harming myself and feel able to stay safe.',
  ],
  [
    'gp',
    'Anxiety discussion',
    'I have been worrying excessively for months and it affects my sleep. I am safe and have no new physical or emergency symptoms.',
  ],
  [
    'gp',
    'Referral request',
    'My previous doctor suggested discussing an ear nose and throat referral. There is no new illness, and I would like a GP appointment.',
  ],
  [
    'gp',
    'Persistent reflux',
    'I get mild heartburn most evenings for a month despite pharmacy advice. No chest pain, difficulty swallowing, blood or weight loss.',
  ],
  [
    'gp',
    'Gradual appetite change',
    'My appetite has been lower than normal for six weeks without vomiting or acute pain. I want a doctor to assess it.',
  ],
  [
    'gp',
    'Repeat ear discomfort',
    'Mild ear discomfort has kept coming back over several weeks. No sudden hearing loss, fever or swelling.',
  ],
  [
    'gp',
    'Cycle changes',
    'My periods have become irregular over the last four months. No heavy bleeding, severe pain or possibility of pregnancy.',
  ],
  [
    'gp',
    'Long-term tiredness',
    'Even with adequate rest I have lacked energy for two months. I can manage daily tasks but would like it investigated.',
  ],
  [
    'gp',
    'Pregnancy question',
    'I am pregnant and have a mild skin itch on my arm with no rash elsewhere or other symptoms. I want personalised medical advice.',
    { pregnant: true },
  ],
  [
    'gp',
    'Ongoing skin problem',
    'I have eczema and the usual cream is not keeping it settled this month. No fever, weeping skin or rapid worsening.',
  ],
  [
    'nurse',
    'Planned injection',
    'My GP has already arranged a routine injection and told me to book with the practice nurse. I have no symptoms today.',
  ],
  [
    'nurse',
    'Annual monitoring',
    'I received an invitation for the nursing part of my annual long-term-condition check. No new concerns.',
  ],
  [
    'nurse',
    'Scheduled dressing',
    'The clinic gave me a plan for a routine dressing change with the nurse tomorrow. The wound is improving without pain, fever or redness.',
  ],
  [
    'nurse',
    'Blood pressure follow-up',
    'The nurse asked me to return for my scheduled blood pressure reading. I am well and have no new symptoms.',
  ],
  [
    'nurse',
    'Vaccination booking',
    'The practice invited me for an already approved routine vaccination. I need to choose a nursing appointment.',
  ],
  [
    'nurse',
    'Suture removal',
    'My discharge plan says the practice nurse should remove the stitches on the agreed date. The site is healing well and I feel well.',
  ],
  [
    'nurse',
    'Routine care plan',
    'I need the planned nursing review written in my care plan. I do not have any new illness.',
  ],
  [
    'nurse',
    'Diabetes annual check',
    'My diabetes team requested the scheduled nursing measurements for my annual review. I have no symptoms or urgent concerns.',
  ],
  [
    'nurse',
    'Screening invitation',
    'I have a routine cervical screening invitation and would like the nurse appointment it recommends. No symptoms.',
  ],
  [
    'nurse',
    'Scheduled observations',
    'My clinician asked the nurse to record my weight and blood pressure at a planned follow-up. I feel normal.',
  ],
  [
    'nurse',
    'Post-review check',
    'The doctor reviewed me last week and requested a routine nurse check in a fortnight. There has been no change in how I feel.',
  ],
  [
    'nurse',
    'Routine wound review',
    'The care plan asks for a scheduled nurse wound review. Healing has been steady with no discharge, spreading redness or fever.',
  ],
  [
    'physio',
    'Shoulder overuse',
    'My shoulder aches mildly after painting a room a fortnight ago. It improves with rest. No injury, chest symptoms, numbness or weakness.',
  ],
  [
    'physio',
    'Desk-related neck stiffness',
    'My neck gets stiff after computer work and loosens with breaks. No trauma, fever, headache, arm weakness or numbness.',
  ],
  [
    'physio',
    'Knee after running',
    'After increasing my runs my knee has a mild ache. I can walk normally. No swelling, locking, fever or injury.',
  ],
  [
    'physio',
    'Elbow discomfort',
    'My elbow has a mild ache after repeated gardening. No swelling, redness, trauma, numbness or loss of strength.',
  ],
  [
    'physio',
    'Back stiffness',
    'My lower back feels mildly stiff after sitting but better when walking. No leg weakness, altered sensation or bowel or bladder changes.',
  ],
  [
    'physio',
    'Wrist strain',
    'Using a new mouse leaves my wrist mildly sore. No fall, swelling, tingling or weakness. I want movement advice.',
  ],
  [
    'physio',
    'Hip muscle tightness',
    'My hip muscles feel tight after exercise. I can bear weight normally with no injury, fever or worsening pain.',
  ],
  [
    'physio',
    'Ankle rehabilitation',
    'My clinician said my old ankle sprain has healed and suggested routine physiotherapy for stiffness. No new injury or swelling.',
  ],
  [
    'physio',
    'Upper back ache',
    'I have a mild upper back ache after desk days that improves with stretching. No chest pain, breathlessness, fever or neurological symptoms.',
  ],
  [
    'physio',
    'Heel after exercise',
    'My heel has a mild ache after long walks for two weeks. I can walk and have no trauma, redness, swelling or fever.',
  ],
  [
    'physio',
    'Calf muscle stiffness',
    'Both calf muscles feel mildly stiff after a longer workout. No one-sided swelling, redness, warmth, injury or breathing problem.',
  ],
  [
    'physio',
    'Posture advice',
    'I want help with mild shoulder tension from my workstation. No pain elsewhere, injury, weakness or numbness.',
  ],
  [
    'physio',
    'Return to activity',
    'My GP suggested routine physiotherapy before I return to exercise following a resolved muscle strain. I have no new symptoms.',
  ],
  [
    'physio',
    'Finger overuse',
    'After long sessions of craft work a finger feels mildly stiff but moves fully. No trauma, swelling, redness, fever or numbness.',
  ],
  [
    'physio',
    'Gluteal tightness',
    'The muscles around my hips feel tight after sitting and improve with walking. No injury, weakness, numbness or bladder changes.',
  ],
  [
    'physio',
    'Knee rehabilitation',
    'My clinician has cleared me for routine knee rehabilitation. I need a first-contact physiotherapy slot, without new pain or swelling.',
  ],
  [
    'urgent',
    'Worsening fever',
    'I have had a fever for three days and am feeling steadily more unwell today. I can breathe normally and am alert, but need help today.',
    { severity: 'moderate' },
  ],
  [
    'urgent',
    'Painful hot joint',
    'My knee has become hot, red and swollen today and I feel feverish. There was no injury. I need same-day advice.',
    { severity: 'severe' },
  ],
  [
    'urgent',
    'Worsening abdominal pain',
    'My abdominal pain has become significant and persistent today. I can speak normally and have not fainted, but it is getting worse.',
    { severity: 'severe' },
  ],
  [
    'urgent',
    'Urinary symptoms with fever',
    'I have painful urination, a temperature and pain in my side. I am awake and breathing normally but feel quite unwell.',
    { severity: 'moderate' },
  ],
  [
    'urgent',
    'New breathlessness on activity',
    'I am newly short of breath walking across a room today. I can speak full sentences, have no chest pain and am not breathless sitting still.',
    { severity: 'moderate' },
  ],
  [
    'urgent',
    'Worsening wound',
    'My wound has become increasingly red and painful with discharge today. I have a fever but am alert and breathing normally.',
    { severity: 'moderate' },
  ],
  [
    'urgent',
    'Persistent vomiting',
    'I have repeatedly vomited today and cannot keep drinks down. I am awake, have not collapsed and do not have blood or severe abdominal pain.',
    { severity: 'moderate' },
  ],
  [
    'urgent',
    'Sudden hearing loss',
    'I suddenly cannot hear properly in one ear since this morning. No head injury, facial weakness or other symptoms.',
  ],
  [
    'urgent',
    'Immunosuppression and fever',
    'I am on chemotherapy and have developed a fever today. I have not collapsed and can breathe normally. I need urgent advice.',
    { conditions: 'On chemotherapy', severity: 'moderate' },
  ],
  [
    'urgent',
    'Eye pain',
    'One eye is painful and red with blurred vision since this morning. There was no chemical exposure or injury.',
    { severity: 'moderate' },
  ],
  [
    'urgent',
    'Rapidly spreading redness',
    'An area of skin on my leg is hot, painful and spreading today with a fever. I am alert and not breathless.',
    { severity: 'moderate' },
  ],
  [
    'urgent',
    'Severe persistent headache',
    'A headache has gradually become severe over the day and is not easing. It was not sudden and there is no weakness, confusion or stiff neck.',
    { severity: 'severe' },
  ],
  [
    'emergency',
    'Crushing chest pain',
    'I have ongoing crushing chest pain, sweating and difficulty breathing right now.',
    { severity: 'severe', redFlags: ['Ongoing crushing chest pain'] },
  ],
  [
    'emergency',
    'Stroke symptoms',
    'My face has suddenly drooped on one side, my speech is slurred and one arm feels weak.',
    { redFlags: ['Sudden facial droop and arm weakness'] },
  ],
  [
    'emergency',
    'Severe breathing difficulty',
    'I am struggling to breathe so much that I cannot get words out and my lips look blue.',
    { severity: 'severe', redFlags: ['Severe breathing difficulty'] },
  ],
  [
    'emergency',
    'Severe allergic reaction',
    'After eating nuts my tongue and throat are swelling and I am struggling to breathe.',
    { redFlags: ['Throat swelling and breathing difficulty'] },
  ],
  [
    'emergency',
    'Unconscious person',
    'The adult beside me has collapsed, is unconscious and is not breathing normally.',
  ],
  [
    'emergency',
    'Major bleeding',
    'There is a deep cut with heavy bleeding that will not stop when pressure is applied.',
    { severity: 'severe', redFlags: ['Uncontrolled heavy bleeding'] },
  ],
  [
    'emergency',
    'Sudden worst headache',
    'I suddenly developed the worst headache of my life and now feel confused.',
    { severity: 'severe' },
  ],
  [
    'emergency',
    'Overdose reported',
    'I have taken a large overdose of tablets just now and need immediate help.',
  ],
  [
    'emergency',
    'Choking',
    'An adult is choking and cannot speak, cough or breathe. This is happening now.',
  ],
  [
    'emergency',
    'Severe chest symptoms',
    'I have heavy chest pressure going into my arm and feel clammy and faint right now.',
    { severity: 'severe' },
  ],
  [
    'emergency',
    'Prolonged seizure',
    'My friend is having a seizure that has continued for more than five minutes and has not stopped.',
  ],
  [
    'emergency',
    'Immediate danger',
    'I have seriously injured myself and am in immediate danger with heavy bleeding.',
    { severity: 'severe' },
  ],
  [
    'review',
    'Insufficient detail',
    'I need some help with a health issue, but have not described what it is yet.',
  ],
  [
    'review',
    'Child request',
    'This request is for my 9-year-old child with an ongoing mild concern, without urgent symptoms.',
    { age: 9 },
  ],
  [
    'review',
    'Unclear symptom',
    'Something feels different and I do not know how to explain it. I have provided no further details.',
  ],
  [
    'review',
    'Teenager request',
    'I am 16 and want to discuss a non-urgent health concern privately. I have no emergency symptoms.',
    { age: 16 },
  ],
  [
    'review',
    'Cannot describe concern',
    'I would prefer the care team to call about a concern I cannot describe in this form. It is not an emergency.',
  ],
  [
    'review',
    'Conflicting details',
    'I have answered on behalf of someone else and I am unsure of their age, symptoms or medical history.',
  ],
  [
    'review',
    'Information missing',
    'I need an appointment but cannot say where the problem is, when it started or how it feels.',
  ],
  [
    'review',
    'Child routine concern',
    'My 12-year-old has a mild ongoing concern and I would like the practice to direct us to the right service.',
    { age: 12 },
  ],
  [
    'review',
    'Unable to give history',
    'I am helping a relative fill this in but do not know what symptoms they have or which medicines they take.',
  ],
  [
    'review',
    'Non-specific request',
    'I have been advised to contact the practice but do not know the reason or which service I need.',
  ],
  [
    'review',
    'Adolescent follow-up',
    'I am 17 and need advice about a non-urgent ongoing issue. There are no immediate danger signs.',
    { age: 17 },
  ],
  [
    'review',
    'Unclear appointment reason',
    'My message only says I would like help. I have not provided symptoms, a care plan or a reason for the visit.',
  ],
];
export const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function unseenCases(): BenchmarkCase[] {
  return scenarios.map(([expected, topic, symptoms, overrides], i) => {
    const input: Intake = {
      symptoms,
      duration: 'As described above',
      severity: 'mild',
      age: 28 + (i % 43),
      pregnant: false,
      conditions: 'None reported',
      medications: 'None reported',
      redFlags: [],
      goal: 'Help choosing an appropriate service',
      consent: true,
      ...overrides,
    };
    return {
      id: `U-${String(i + 1).padStart(3, '0')}`,
      topic,
      input,
      expected,
      inputHash: hash(input),
    };
  });
}
