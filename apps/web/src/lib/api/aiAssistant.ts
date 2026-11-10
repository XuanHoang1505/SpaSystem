import { AiAssistantApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi } from './call';

/** Runs one AiAssistantApi call on the shared client and returns the envelope's data. */
export function callAiAssistant<T>(
  call: (api: AiAssistantApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new AiAssistantApi(client), call);
}
