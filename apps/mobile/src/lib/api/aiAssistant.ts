import { AiAssistantApi, aiAssistantErrorCodes, aiAssistantQueryKeys } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

/**
 * Access the shared AiAssistantApi instance for mobile.
 * Uses the shared ApiClient with authentication headers attached if the user has an active session.
 */
export function getAiAssistantApi(): { api?: AiAssistantApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new AiAssistantApi(client) } : { error };
}

/** Runs one AiAssistantApi call and returns the unwrapped data payload. */
export async function callAiAssistant<T>(
  call: (api: AiAssistantApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getAiAssistantApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

export { aiAssistantQueryKeys, aiAssistantErrorCodes };
