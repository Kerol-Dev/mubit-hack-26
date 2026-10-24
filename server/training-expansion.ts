import type { Intake, Route } from '../shared/types';
import { history } from './data';
import { unseenCases, hash } from './benchmark-data';
import { intakeSchema } from './navigation';

// Fictional author-written TRAINING inputs only. Intended routes are local QA hints,
// never included in the model request and never presented as clinical ground truth.
// No evaluation outputs or failed evaluation cases are used to construct this set.
const cases: Record<Route, string[]> = {
  pharmacy: [
    'I want advice about a small corn from tight shoes. It is only mildly uncomfortable, the skin is intact and I have no diabetes or circulation problems.',
    'My nose runs whenever I dust the house. It stops afterwards. I feel well, with no wheezing or swelling, and want advice about reducing irritation.',
    'I have a small wart on one finger that has been unchanged for months. No bleeding or pain. Can I ask about over-the-counter options?',
    'A plaster left a small itchy square on my forearm yesterday. The skin is intact, it is not spreading and I otherwise feel normal.',
    'I would like advice about a gentle sunscreen for sensitive skin. I do not have a rash or any symptoms today.',
    'My feet smell after wearing trainers all day. There are no sores, swelling or pain. I would like advice about foot hygiene products.',
    'A new shampoo made a small part of my scalp itchy yesterday. I stopped using it; there are no sores, swelling or other symptoms.',
    'I have a mildly itchy patch under my watch strap after wearing it in the heat. It is not hot or painful and there is no fever.',
    'I want to ask how to dispose of some expired tablets safely. I have not taken any and feel well.',
    'I bought a digital thermometer and would like help understanding how to use it. Nobody is ill at present.',
    'I have one small cold sore like ones I have had before. It started yesterday. I am otherwise well, with no eye symptoms or immune problems.',
    'My elbows have rough dry skin in the winter. No cracks, rash, bleeding or pain. I want help choosing a moisturiser.',
    'I would like advice about which reusable earplugs suit swimming. I have no ear pain, discharge or hearing problems.',
    'I need someone to explain the expiry date printed on a sealed medicine packet. I have taken none of it and have no symptoms.',
  ],
  gp: [
    'I want to discuss a referral to a neurologist for a stable condition already diagnosed years ago. Nothing has changed recently and I have no new symptoms.',
    'My optician recommended a routine discussion with my GP about a non-urgent referral. I have no new eye pain or sudden sight change.',
    'I would like to discuss a genetics referral because a relative was diagnosed with an inherited condition. I feel well and have no symptoms.',
    'For three months my hands have shaken slightly when holding a cup. It came on gradually, with no weakness, facial change or speech difficulty.',
    'Over several months I have noticed a gradual reduction in my sense of smell. There was no injury and I am not acutely unwell.',
    'My hair has been thinning gradually for half a year. No scalp pain or sudden illness. I want to discuss possible causes with a doctor.',
    'I want to review my established migraine treatment. The pattern is unchanged and I have no headache or new symptoms now.',
    'I have been getting up to pass urine more often at night for several months. No fever, pain, blood or inability to pass urine.',
    'I want to talk about contraception options and my medical history before choosing anything. I have no acute symptoms.',
    'My specialist asked the GP to review a stable long-term medicine before issuing the next prescription. I have enough left and feel well.',
    'My toenail has slowly changed in appearance over several months and pharmacy advice has not helped. No pain, spreading redness or fever.',
    'I would like to discuss whether fertility investigations are appropriate after a year of trying. I have no pain or urgent symptoms.',
    'A mild tremor has persisted for weeks. I can manage normally, but want a medical review rather than booking straight with a specialist.',
    'I have a longstanding stable digestive condition and want my GP to discuss a dietitian referral. There are no new or worsening symptoms.',
  ],
  nurse: [
    'The GP has documented a routine stitch removal with the practice nurse on Friday. The cut is healing well, without redness, discharge or fever.',
    'I have a letter inviting me to an already scheduled cervical screening appointment. I have no symptoms and need to choose a nursing slot.',
    'My care plan says the nurse should repeat my weight measurement this month. It is routine monitoring and I have no new concerns.',
    'I need the second nursing appointment already arranged in my vaccination course. The first appointment went well and I feel well today.',
    'The nurse asked me to bring my home blood pressure monitor to a planned technique check. I am not having any symptoms.',
    'I need to book the routine foot check that the diabetes nurse invited me to. No wounds, pain, colour changes or new symptoms.',
    'My GP ordered routine blood samples and told me to arrange the practice nursing appointment. There is no urgent request and I feel well.',
    'The nurse booked a planned inhaler technique review for my stable asthma. I am breathing normally and have no worsening symptoms.',
    'I need a scheduled review of the dressing on a healing surgical incision under my existing nursing plan. No new pain, discharge or fever.',
    'I was invited to a routine height and weight check with the nurse as part of my care plan. I have no current symptoms.',
    'The GP asked me to see the nurse for the routine monitoring portion of an existing care plan, not a new diagnosis. I am well.',
    'I need to rearrange my planned nursing appointment for a routine injection already prescribed by the clinician. No new symptoms.',
    'I have a practice letter to book a routine screening test with the nursing team. It is a standard invitation and I feel well.',
    'The practice nurse arranged a follow-up to check that I can use my home monitoring equipment correctly. This is planned, and I have no acute concerns.',
  ],
  physio: [
    'My elbow aches mildly after repetitive typing for a fortnight. No injury, swelling, warmth, fever, numbness or weakness. I can move it normally.',
    'My upper back feels tight after sitting for long periods and eases with gentle movement. No injury, chest pain, breathing trouble or neurological symptoms.',
    'My wrist feels mildly stiff after gardening. I can use it normally, with no injury, swelling, numbness or weakness.',
    'I have a mild ache in my calf only after longer training sessions. It resolves with rest; no swelling, redness, warmth, breathlessness or injury.',
    'My ankle feels stiff after returning to jogging, without an injury. I walk normally and there is no swelling, redness, fever or severe pain.',
    'My forearm muscles get mildly sore after playing guitar and settle when I rest. No weakness, numbness, trauma or swelling.',
    'My hip muscles feel tight after long seated days. Walking eases it. No fall, fever, inability to bear weight or severe pain.',
    'My lower back is mildly stiff after desk work and better on days I move more. No injury, weakness, numbness, bladder changes, fever or weight loss.',
    'My shoulder muscles ache mildly after carrying a light bag for long periods. It improves with rest, and there is no chest pain, injury or arm weakness.',
    'My heel is mildly uncomfortable after long walks, without an injury. I can bear weight and have no swelling, wound, redness or fever.',
    'I would like exercise advice for mild recurring muscular neck tension from my work setup. No headache, fever, injury, weakness or numbness.',
    'My knee muscles feel tight after cycling but loosen with gentle movement. No trauma, swelling, heat, locking or difficulty walking.',
    'My hand feels mildly stiff after lengthy drawing sessions, then settles. There is no injury, swelling, redness, numbness or weakness.',
    'I have a small amount of muscle soreness around my shoulder after a new exercise routine. Movement is normal; no injury, chest symptoms, swelling or weakness.',
  ],
  urgent: [
    'I have a painful hot swollen knee that developed today with a fever. I can still speak and breathe normally, but it is getting worse.',
    'My ear pain is much worse today and I have a fever and swelling around the ear. I need advice today rather than a routine future visit.',
    'I am passing urine painfully with a fever and pain in my back today. I feel increasingly unwell but am alert and breathing normally.',
    'I have repeated vomiting today and am struggling to keep fluids down. I am passing less urine, but I am alert without severe pain or blood.',
    'A wound on my lower leg has become hot, increasingly red and painful today with a fever. I am alert and breathing normally.',
    'I developed a painful red eye today and bright light hurts. I need advice promptly, rather than a routine optician appointment.',
    'My abdominal pain has become severe this afternoon and is not settling. I am awake and breathing normally, with no collapse or vomiting blood.',
    'My ankle is very painful and swollen after twisting it today, and I cannot put weight on it. There is no visible deformity or open wound.',
    'I have a new painful rash that is rapidly spreading across my arm today and feel feverish. I have no breathing difficulty or facial swelling.',
    'I have a sudden major reduction in hearing in one ear today. There is no injury, weakness or speech change, but I need prompt assessment.',
    'I have had diarrhoea all day and now feel dizzy when standing and am passing very little urine. I am awake and able to drink small sips.',
    'I am pregnant and have new painful urination with a fever today. I am alert without collapse or severe breathing difficulty.',
    'I take medicines that suppress my immune system and have developed a fever today. I need same-day assessment, even though I can still walk and talk.',
    'I have worsening pain and swelling around a skin wound today after an animal bite. I am alert and have no breathing or circulation problems.',
  ],
  emergency: [
    'A few minutes ago my tongue and throat swelled after eating and now I am struggling for breath. I cannot speak normally.',
    'My left arm suddenly became weak and my words are coming out wrong. This started ten minutes ago and is still happening.',
    'I have heavy pressure in my chest right now with sweating and nausea, and the pain is spreading to my jaw.',
    'I am gasping for air and my partner says my lips look blue. I cannot get a full sentence out.',
    'My partner is unconscious and not breathing normally. I am entering this for them and need immediate help.',
    'I am bleeding heavily from a deep injury and firm pressure has not stopped it. I feel faint.',
    'My face suddenly looks uneven and I cannot lift one arm properly. It began moments ago and has not resolved.',
    'I have ongoing squeezing chest pain and severe breathlessness. I was going to ask for a heart specialist appointment but it is happening now.',
    'After a sting I suddenly developed swollen lips and tongue and noisy difficult breathing. It is getting worse very quickly.',
    'Someone with me collapsed and will not wake when I speak or shake their shoulder. Their breathing is abnormal.',
    'I have a sudden severe breathing problem and cannot say more than a couple of words. Please do not put me in a routine appointment queue.',
    'I have chest pressure spreading through my back and arm, feel clammy, and think I may pass out. It is happening now.',
    'A person beside me suddenly lost the ability to speak clearly and one side of their body is weak. They were normal five minutes ago.',
    'I have severe throat swelling and cannot breathe properly after taking a new medicine. I need immediate help, not a later appointment.',
  ],
  review: [
    'Something about my health worries me, but I have not described what it is, when it began or any symptoms. Please help me provide the missing details.',
    'I need an appointment for my child aged nine, who has a mild non-urgent concern. This is an adult portal and I need the correct team.',
    'I am 16 and have a non-urgent question about my health. I have not described symptoms, and I need the appropriate young-person service.',
    'I have copied only a reference number into this form, with no symptoms or clinical context. I need someone to ask what the request is about.',
    'I want help but cannot tell whether I am describing a medicine question or a new symptom. No usable details are provided in this message.',
    'A relative asked me to arrange an appointment, but I do not know their symptoms, age, existing plan or reason for the visit.',
    'My message just says please call me. I have not explained the concern, its duration or whether anything urgent is happening.',
    'I selected a service by accident and have not entered any health concern. I need help completing the request before a route is suggested.',
    'I am asking about my 14-year-old and a longstanding non-urgent concern. There are no new danger signs; please use a children’s pathway.',
    'I want to discuss a confidential issue, but I have provided no symptom details or context in this form yet.',
    'The appointment is for another person, but I cannot confirm their age or what they need help with. I have not supplied any symptom information.',
    'I have written that something is wrong without saying what, where, or for how long. I need a person to clarify the request.',
    'I am 17, otherwise well, and want advice about a minor question. There are no urgent symptoms; this adult form is not the correct route.',
    'My submitted text is incomplete and only says I need advice about it. There is no information explaining what it refers to.',
  ],
};

export const expandedTraining = Object.entries(cases).flatMap(([route, descriptions]) =>
  descriptions.map((symptoms, i) => {
    const expected = route as Route;
    const input: Intake = {
      symptoms,
      duration:
        route === 'urgent'
          ? 'Today'
          : route === 'emergency'
            ? 'Within minutes'
            : 'As described in the request',
      severity: route === 'urgent' || route === 'emergency' ? 'severe' : 'mild',
      age: 34 + i,
      pregnant: route === 'urgent' && i === 11,
      conditions: route === 'urgent' && i === 12 ? 'Immunosuppressed' : 'None reported',
      medications:
        route === 'urgent' && i === 12 ? 'Immunosuppressive medication' : 'None reported',
      redFlags: [],
      goal: 'Help me choose the appropriate next service',
      consent: true,
    };
    if (route === 'review' && [1, 2, 8, 12].includes(i))
      input.age = ({ 1: 9, 2: 16, 8: 14, 12: 17 } as Record<number, number>)[i];
    intakeSchema.parse(input);
    return {
      id: `T2-${route}-${String(i + 1).padStart(2, '0')}`,
      topic: `Expanded ${route} navigation`,
      split: 'training' as const,
      expected,
      input,
      inputHash: hash(input),
    };
  }),
);

// Exact input and wording separation; labels are not fed back from evaluations.
const existing = [...history, ...unseenCases()];
const seen = new Set(existing.map((c) => c.input.symptoms.toLowerCase().replace(/\W+/g, ' ')));
for (const c of expandedTraining) {
  const text = c.input.symptoms.toLowerCase().replace(/\W+/g, ' ');
  if (seen.has(text)) throw Error(`Duplicate training input: ${c.id}`);
  seen.add(text);
}
