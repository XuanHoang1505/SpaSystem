import { useQuery } from '@tanstack/react-query';
import { aiAssistantQueryKeys } from '@spa/api-client';
import type { AiChatHistoryQuery } from '@spa/shared-types';
import { callAiAssistant } from '@/lib/api/aiAssistant';

export function useAiHistory(query?: AiChatHistoryQuery, enabled = true) {
  return useQuery({
    queryKey: aiAssistantQueryKeys.history(query),
    queryFn: () => callAiAssistant((api) => api.getHistory(query)),
    enabled,
    staleTime: 5 * 60_000,
  });
}
