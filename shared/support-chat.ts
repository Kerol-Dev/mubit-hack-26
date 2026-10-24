import type { Intake, CareRequest, Appointment } from './types';
export type SupportMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  draft?: Intake;
  requestId?: string;
  bookingId?: string;
  receipt?: string;
  urgentCare?: { postcode: string };
  error?: string;
  request?: CareRequest;
  appointment?: Appointment;
};
export type SupportConversation = { messages: SupportMessage[]; configured: boolean };

export function urgentCareSearch(text: string): { postcode: string } | undefined {
  if (
    !/urgent[ -]care|urgent treatment|walk[ -]?in|minor injur|(?:waiting?|queue).{0,20}(?:times?|long)|(?:nearest|closest).{0,30}(?:hospital|a&e|centre)/i.test(
      text,
    )
  )
    return;
  const match = text.toUpperCase().match(/\b(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/);
  const compact = match?.[0].replace(/\s/g, '') || '';
  return { postcode: compact ? compact.slice(0, -3) + ' ' + compact.slice(-3) : '' };
}
