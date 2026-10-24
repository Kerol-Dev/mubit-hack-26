import type { CarePreference } from './departments';
export type Route = 'pharmacy' | 'gp' | 'nurse' | 'physio' | 'urgent' | 'emergency' | 'review';
export const services: Record<
  Route,
  { name: string; label: string; description: string; duration: number }
> = {
  pharmacy: {
    name: 'Community pharmacist',
    label: 'Pharmacy care',
    description: 'Advice and treatment for common, minor conditions.',
    duration: 15,
  },
  gp: {
    name: 'General practitioner',
    label: 'GP appointment',
    description: 'A closer look at your symptoms and the right next step.',
    duration: 20,
  },
  nurse: {
    name: 'Practice nurse',
    label: 'Nurse appointment',
    description: 'Routine checks, monitoring and planned care.',
    duration: 15,
  },
  physio: {
    name: 'First-contact physiotherapist',
    label: 'Physiotherapy',
    description: 'Support for everyday muscle, joint and movement concerns.',
    duration: 25,
  },
  urgent: {
    name: 'Urgent care',
    label: 'Help today',
    description: 'Please get medical help today. Do not wait for a routine appointment.',
    duration: 0,
  },
  emergency: {
    name: 'Emergency services',
    label: 'Get help now',
    description: 'Call 999 now. Do not wait for an online response.',
    duration: 0,
  },
  review: {
    name: 'Practice care team',
    label: 'Care team review',
    description: 'Your request needs a closer look from the practice team.',
    duration: 0,
  },
};
export type Intake = {
  symptoms: string;
  duration: string;
  severity: 'mild' | 'moderate' | 'severe';
  age: number;
  pregnant: boolean;
  conditions: string;
  medications: string;
  redFlags: string[];
  goal: string;
  consent: boolean;
};
export type Decision = {
  route: Route;
  summary: string;
  reason: string;
  nextStep: string;
  safetyNet: string;
  needsReview: boolean;
  source: 'mubit' | 'safety' | 'unavailable';
  requestId?: string;
  durationMs?: number;
};
export type CareRequest = {
  carePreference?: CarePreference;
  id: string;
  patientId?: string;
  createdAt: string;
  input: Intake;
  decision: Decision;
  status: 'awaiting_booking' | 'review' | 'booked' | 'urgent' | 'closed';
  notes: string;
  history: { at: string; text: string }[];
};
export type Clinician = {
  funding?: 'NHS' | 'Private';
  feeGbp?: number;
  photoId?: string;
  id: string;
  name: string;
  role: Route;
  title: string;
  initials: string;
  color: string;
  bio: string;
  languages: string[];
  location: string;
};
export type Slot = {
  id: string;
  clinicianId: string;
  date: string;
  time: string;
  mode: 'In person' | 'Telephone';
  route: Route;
};
export type Booking = {
  funding?: 'NHS' | 'Private';
  feeGbp?: number | null;
  id: string;
  requestId: string;
  slotId: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  reason: string;
};
export type Appointment = Booking & { slot: Slot; clinician: Clinician };
export type TrainingJob = {
  id: string;
  status: 'running' | 'complete' | 'partial' | 'cancelled';
  count: number;
  completed: number;
  errors: number;
  error?: string;
  startedAt: string;
};
export type HistoricalCase = {
  id: string;
  input: Intake;
  expected: Route;
  topic: string;
  split: 'training' | 'evaluation';
};
export type State = {
  patient: Patient;
  clinicians: Clinician[];
  appointments: Appointment[];
  requests: CareRequest[];
  configured: boolean;
  model: string;
  training: {
    available: number;
    recorded: number;
    evalAvailable: number;
    jobs: TrainingJob[];
    taskName: string;
    consoleUrl: string;
    consoleSnapshot?: {
      checkedAt: string;
      kept: number;
      waiting: number | null;
      training: string;
      serving: string;
    };
  };
  evaluation: { count: number; matched: number; meanLatencyMs: number | null };
  practice: { name: string; address: string; hours: string };
};

export type Patient = {
  name: string;
  firstName: string;
  initials: string;
  dob: string;
  age: number;
  email: string;
  address: string;
  photo: string;
  phone: string;
  preference: 'Email' | 'Telephone' | 'Portal only';
  conditions: string;
  medications: string;
  complete: boolean;
};
