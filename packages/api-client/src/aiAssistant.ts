import type {
  AiChatHistory,
  AiChatHistoryQuery,
  AiChatReply,
  ApiResponse,
  AskAiAssistantRequest,
} from '@spa/shared-types';
import type { ApiClient, RequestOptions } from './index';

export class AiAssistantApi {
  constructor(private readonly client: ApiClient) {}

  chat(
    body: AskAiAssistantRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<AiChatReply>> {
    return this.client.post<AskAiAssistantRequest, ApiResponse<AiChatReply>>(
      '/api/v1/ai/chat',
      body,
      options,
    );
  }

  getHistory(
    query?: AiChatHistoryQuery,
    options?: RequestOptions,
  ): Promise<ApiResponse<AiChatHistory>> {
    return this.client.get<ApiResponse<AiChatHistory>>('/api/v1/me/ai/history', {
      ...options,
      query: {
        ...(query?.before ? { before: query.before } : {}),
        ...(query?.limit !== undefined ? { limit: query.limit } : {}),
      },
    });
  }
}

export const aiAssistantQueryKeys = {
  all: ['aiAssistant'] as const,
  history: (query?: AiChatHistoryQuery) =>
    ['aiAssistant', 'history', query?.before ?? 'latest', query?.limit ?? 20] as const,
};

export const aiAssistantErrorCodes = {
  validationError: 'validation_error',
  emptyQuestion: 'empty_question',
  forbidden: 'forbidden',
  rateLimited: 'rate_limited',
  aiUnavailable: 'ai_unavailable',
} as const;
