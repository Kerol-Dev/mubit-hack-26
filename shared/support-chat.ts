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
  error?: string;
  request?: CareRequest;
  appointment?: Appointment;
};
export type SupportConversation = { messages: SupportMessage[]; configured: boolean };
