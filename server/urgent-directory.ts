import locations from '../data/uk-services/locations.json';
import northernIreland from '../data/uk-services/northern-ireland.json';
import officialOverrides from '../data/uk-services/official-overrides.json';
import { urgentSites, type UrgentSite } from '../shared/urgent-care';
export const directoryVersion = '2026-10-24';
export function distanceMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (x: number) => (x * Math.PI) / 180,
    p = rad(b.latitude - a.latitude),
    q = rad(b.longitude - a.longitude);
  return (
    Math.round(
      3958.8 *
        2 *
        Math.asin(
          Math.sqrt(
            Math.sin(p / 2) ** 2 +
              Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(q / 2) ** 2,
          ),
        ) *
        10,
    ) / 10
  );
}
const raw = [...officialOverrides, ...locations, ...northernIreland];
const curated = urgentSites.map((s) => ({
  ...s,
  sourceUrl: s.url,
  country: 'England',
  kind: s.id === 'central-middlesex' ? 'urgent' : 'ae',
}));
export const nationalSites: UrgentSite[] = [
  ...curated,
  ...raw
    .filter(
      (s) =>
        !curated.some(
          (c) =>
            distanceMiles(c, s) < 0.3 &&
            (c.postcode === s.postcode ||
              c.name.toLowerCase().split(' ')[0] === s.name.toLowerCase().split(' ')[0]),
        ),
    )
    .map((s) => ({
      ...s,
      hours: 'Check opening hours with the centre',
      opens: 0,
      lastEntry: 24,
      access:
        s.kind === 'urgent'
          ? 'Urgent care service. Check access and opening hours before travelling.'
          : 'Emergency department listed in the directory. Contact the local urgent-care service to check where to go.',
    })),
];
export function nearestSites(point: { latitude: number; longitude: number }, limit = 5) {
  const found: { site: UrgentSite; distanceMiles: number }[] = [];
  for (const site of [...nationalSites].sort(
    (a, b) => distanceMiles(point, a) - distanceMiles(point, b),
  )) {
    if (
      found.some(
        (x) =>
          distanceMiles(x.site, site) < 0.15 &&
          (x.site.postcode === site.postcode || x.site.name === site.name),
      )
    )
      continue;
    found.push({ site, distanceMiles: distanceMiles(point, site) });
    if (found.length === limit) break;
  }
  return found;
}
export function nationalHelp(country: string) {
  if (country === 'Northern Ireland')
    return {
      label: 'Find local urgent help',
      url: 'https://www.nidirect.gov.uk/articles/urgent-and-emergency-care-services',
      message:
        'Use your local Phone First service to check where to go. Arrangements vary by hospital.',
    };
  if (country === 'Scotland')
    return {
      label: 'NHS 24 · Call 111',
      url: 'https://www.nhs24.scot/111/',
      message: 'Phone NHS 24 on 111 before attending for urgent, non-life-threatening care.',
    };
  if (country === 'Wales')
    return {
      label: 'NHS 111 Wales',
      url: 'https://111.wales.nhs.uk/',
      message: 'NHS 111 Wales can help you find the right local service.',
    };
  return {
    label: 'Get help from NHS 111',
    url: 'https://111.nhs.uk/',
    message: 'NHS 111 can check which service is right for you.',
  };
}
const cache = new Map<
  string,
  { at: number; point: { latitude: number; longitude: number; country: string; postcode: string } }
>();
export async function lookupPostcode(input: string) {
  const postcode = input.replace(/\s/g, '').toUpperCase();
  if (!/^(?:[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}|GIR0AA)$/.test(postcode))
    throw Error('Enter a valid UK postcode.');
  const hit = cache.get(postcode);
  if (hit && Date.now() - hit.at < 86400000) return hit.point;
  const r = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(postcode), {
    signal: AbortSignal.timeout(8000),
  });
  const data = await r.json();
  if (!r.ok || !data.result)
    throw Error('We could not find that postcode. Check it and try again.');
  const p = data.result;
  if (
    !['England', 'Scotland', 'Wales', 'Northern Ireland'].includes(p.country) ||
    !Number.isFinite(p.latitude) ||
    !Number.isFinite(p.longitude)
  )
    throw Error('Enter a postcode in England, Scotland, Wales or Northern Ireland.');
  const point = {
    latitude: p.latitude,
    longitude: p.longitude,
    country: p.country,
    postcode: p.postcode,
  };
  if (cache.size >= 2000) cache.delete(cache.keys().next().value!);
  cache.set(postcode, { at: Date.now(), point });
  return point;
}
