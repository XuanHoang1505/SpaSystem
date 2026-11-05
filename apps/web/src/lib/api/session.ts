import { ApiClientError, AuthApi, type ApiClient } from '@spa/api-client';
import type { AuthResult } from '@spa/shared-types';
import { readEnvironment } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';
import { createWebApiClient } from './client';

/** Another tab may have just rotated the shared cookie (BR-AUTH-22): wait, then try once more. */
const RESTORE_RETRY_DELAY_MS = 300;

let cached: { baseUrl: string; client: ApiClient } | undefined;

/** The shared web client for the configured API, or the configuration error (no fallback URL). */
export function getApiClient(): { client?: ApiClient; error?: string } {
  const { apiBaseUrl, error } = readEnvironment();
  if (!apiBaseUrl) return { error };
  if (cached?.baseUrl !== apiBaseUrl)
    cached = {
      baseUrl: apiBaseUrl,
      client: createWebApiClient(apiBaseUrl, { refresh: refreshSession }),
    };
  return { client: cached.client };
}

export function getAuthApi(): { api?: AuthApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new AuthApi(client) } : { error };
}

let inFlight: Promise<AuthResult> | null = null;

/** One `/auth/refresh` at a time: concurrent callers share the same request. */
function requestRefresh(): Promise<AuthResult> {
  inFlight ??= (async () => {
    const { api, error } = getAuthApi();
    if (!api) throw new Error(error);
    const response = await api.refresh();
    if (!response.data) throw new ApiClientError('Empty refresh response.', 500);
    return response.data;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Renews the access token; on failure the session ends as expired. */
export async function refreshSession(): Promise<boolean> {
  try {
    useAuthStore.getState().setSession(await requestRefresh());
    return true;
  } catch {
    useAuthStore.getState().endSession('expired');
    return false;
  }
}

/** Run once at start-up: the cookie, if any, becomes a session; anything else is a quiet anonymous visit. */
export async function restoreSession(): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      useAuthStore.getState().setSession(await requestRefresh());
      return;
    } catch (error) {
      const retry = attempt === 0 && error instanceof ApiClientError && error.status === 401;
      if (!retry) break;
      await new Promise((resolve) => setTimeout(resolve, RESTORE_RETRY_DELAY_MS));
    }
  }
  // A login that finished while the restore was failing keeps its session.
  if (useAuthStore.getState().status === 'restoring') useAuthStore.getState().markAnonymous();
}
