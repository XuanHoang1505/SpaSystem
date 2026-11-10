export type AiProductType = 'service' | 'package';

export type AiBookingKind = 'book_now' | 'book_entitlement' | 'book_session';

export interface AiProductSuggestion {
  productType: AiProductType;
  productId: string;
  name: string;
  price: number;
  path: string;
}

export interface AiBookingProposal {
  kind: AiBookingKind;
  spaServiceId: string | null;
  serviceEntitlementId: string | null;
  treatmentSessionId: string | null;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  staffMemberId: string | null;
  staffName: string | null;
  path: string;
}

export interface AiChatReply {
  answer: string;
  suggestions: readonly AiProductSuggestion[];
  bookingProposals: readonly AiBookingProposal[];
  saved: boolean;
  messageId: string | null;
}

export interface AiChatMessage {
  id: string;
  question: string;
  answer: string;
  createdAtUtc: string;
}

export interface AiChatHistory {
  items: readonly AiChatMessage[];
  hasMore: boolean;
}

export interface AiChatHistoryQuery {
  before?: string;
  limit?: number;
}

export interface AskAiAssistantRequest {
  question: string;
}
