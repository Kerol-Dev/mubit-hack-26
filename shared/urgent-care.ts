export const urgentConditions = [
  'Injury or sprain',
  'Cut or minor burn',
  'Skin concern',
  'Ear or throat concern',
  'Other urgent concern',
] as const;
export type UrgentCondition = (typeof urgentConditions)[number];
export type UrgentInput = {
  symptoms: string;
  postcode: string;
  condition: UrgentCondition;
  emergency: boolean;
  adult: boolean;
  severity?: 'mild' | 'moderate' | 'severe';
  worsening?: boolean;
};
export type UrgentSite = {
  id: string;
  name: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  hours: string;
  opens: number;
  lastEntry: number;
  access: string;
  url: string;
  sourceUrl?: string;
  country?: string;
  kind?: string;
  phone?: string;
};
export const urgentSites: UrgentSite[] = [
  {
    id: 'central-middlesex',
    name: 'Central Middlesex',
    address: 'Acton Lane, Park Royal',
    postcode: 'NW10 7NS',
    latitude: 51.5305,
    longitude: -0.2575,
    hours: '08:00–21:00 · last registration 20:00',
    opens: 8,
    lastEntry: 20,
    access: 'Walk-in urgent treatment centre. No A&E on this site.',
    url: 'https://www.lnwh.nhs.uk/urgent-treatment-centre/',
  },
  {
    id: 'st-marys',
    name: 'St Mary’s Hospital',
    address: 'South Wharf Road, Paddington',
    postcode: 'W2 1NY',
    latitude: 51.5174,
    longitude: -0.1736,
    hours: '24 hours, every day',
    opens: 0,
    lastEntry: 24,
    access: 'Register at A&E reception. The clinical team decides the appropriate service.',
    url: 'https://www.imperial.nhs.uk/our-services/emergency-care/urgent-treatment-centres',
  },
  {
    id: 'charing-cross',
    name: 'Charing Cross',
    address: 'Fulham Palace Road, Hammersmith',
    postcode: 'W6 8RF',
    latitude: 51.4868,
    longitude: -0.2197,
    hours: '24-hour A&E access · UTC after assessment',
    opens: 0,
    lastEntry: 24,
    access: 'Register inside A&E. Assessment determines the appropriate service.',
    url: 'https://www.imperial.nhs.uk/our-services/emergency-care/urgent-treatment-centres',
  },
];
export type WaitEstimate = {
  site: UrgentSite;
  distanceMiles: number;
  available: boolean | null;
  estimateMinutes: number | null;
  lowMinutes: number | null;
  highMinutes: number | null;
  explanation: string;
  historyCount: number;
};
export type UrgentResult = {
  id: string;
  status: 'estimate' | 'emergency' | 'review' | 'outside-area' | 'directory';
  message: string;
  createdAt: string;
  results: WaitEstimate[];
  help?: { label: string; url: string; message: string };
  directory?: { version: string; count: number; country: string; postcode: string };
  receipt?: {
    requestId: string;
    model: string;
    durationMs: number;
    serving: 'provider' | 'adapter' | 'unverified';
    adapterId?: string;
  };
  dataLabel: string;
};

export function centresWithEstimates(results: WaitEstimate[]): WaitEstimate[] {
  return results.filter(
    (x) =>
      x.available !== false &&
      typeof x.estimateMinutes === 'number' &&
      Number.isFinite(x.estimateMinutes) &&
      typeof x.lowMinutes === 'number' &&
      Number.isFinite(x.lowMinutes) &&
      typeof x.highMinutes === 'number' &&
      Number.isFinite(x.highMinutes) &&
      x.lowMinutes >= 5 &&
      x.lowMinutes <= x.estimateMinutes &&
      x.estimateMinutes <= x.highMinutes &&
      x.highMinutes <= 360 &&
      x.highMinutes - x.lowMinutes >= 20,
  );
}
