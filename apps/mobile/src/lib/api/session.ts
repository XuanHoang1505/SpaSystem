import { ApiClientError, AuthApi, type ApiClient } from '@spa/api-client';
import type { ApiResponse, AuthResult } from '@spa/shared-types';
import { readEnvironment } from '@/config/env';
import { clearRefreshToken, readRefreshToken, saveRefreshToken } from '@/lib/auth/tokenStorage';
import { useAuthStore } from '@/stores/authStore';
import { createMobileApiClient } from './client';

let cached: { baseUrl: string; client: ApiClient } | undefined;

/** The shared mobile client for the configured API, or the configuration error (no fallback URL). */
export function getApiClient(): { client?: ApiClient; error?: string } {
  const { apiBaseUrl, error } = readEnvironment();
  if (!apiBaseUrl) return { error };
  if (cached?.baseUrl !== apiBaseUrl)
    cached = {
      baseUrl: apiBaseUrl,
      client: createMobileApiClient(apiBaseUrl, { refresh: refreshSession }),
    };
  return { client: cached.client };
}

export function getAuthApi(): { api?: AuthApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new AuthApi(client) } : { error };
}

/** Runs one AuthApi call and returns the envelope's data; a missing configuration is an error. */
export async function callAuth<T>(call: (api: AuthApi) => Promise<ApiResponse<T>>): Promise<T> {
  const { api, error } = getAuthApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) throw new Error('Empty API response.');
  return response.data;
}

/** Runs one AuthApi call that answers 204 No Content. */
export async function callAuthVoid(call: (api: AuthApi) => Promise<void>): Promise<void> {
  const { api, error } = getAuthApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  await call(api);
}

/** Stores a new session: the rotated refresh token on the device, the rest in memory. */
export async function signIn(result: AuthResult): Promise<void> {
  if (result.refreshToken) await saveRefreshToken(result.refreshToken);
  useAuthStore.getState().setSession(result);
}

async function endLocalSession() {
  await clearRefreshToken();
  useAuthStore.getState().endSession();
}

/** Statuses of /auth/refresh that mean the session is really over (bad/locked token, rate limit). */
const sessionOverStatuses = new Set([400, 401, 403, 429]);

let inFlight: Promise<boolean> | null = null;

/**
 * Renews the access token with the stored refresh token. Concurrent callers share one request, so a rotated token is
 * never sent twice. Only a refusal from the API ends the session; a network drop or 5xx keeps the token.
 */
export function refreshSession(): Promise<boolean> {
  inFlight ??= (async () => {
    const token = await readRefreshToken();
    if (!token) {
      useAuthStore.getState().endSession();
      return false;
    }
    try {
      await signIn(await callAuth((api) => api.refresh({ refreshToken: token })));
      return true;
    } catch (error) {
      if (error instanceof ApiClientError && sessionOverStatuses.has(error.status))
        await endLocalSession();
      return false;
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Run once at start-up: a stored token becomes a session; anything else is a quiet anonymous start. */
export async function restoreSession(): Promise<void> {
  const ok = (await readRefreshToken()) ? await refreshSession() : false;
  // A sign-in that finished while the restore was failing keeps its session.
  if (!ok && useAuthStore.getState().status === 'restoring') useAuthStore.getState().endSession();
}

/** Ends the session on the device whatever the API answers (UC-SPA-02 A3). */
export async function signOut(): Promise<void> {
  const token = await readRefreshToken();
  const { api } = getAuthApi();
  try {
    if (api && token && useAuthStore.getState().accessToken)
      await api.logout({ refreshToken: token });
  } catch {
    // The token is dropped locally anyway; the server forgets it when it expires.
  } finally {
    await endLocalSession();
  }
}
