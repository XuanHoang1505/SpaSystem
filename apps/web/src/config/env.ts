import { validateApiBaseUrl } from '@spa/api-client';

/**
 * The API base URL. With `VITE_API_SAME_ORIGIN=true` (set by `npm run dev`) the web calls its own origin and the Vite
 * proxy forwards `/api` and `/hubs` to the backend, so the page and the API are always one site whether it is opened
 * on localhost or the LAN IP, and the `SameSite=Strict` refresh cookie keeps working after a reload.
 */
export function readEnvironment(
  value: string | undefined = import.meta.env.VITE_API_BASE_URL,
  sameOrigin: boolean = import.meta.env.VITE_API_SAME_ORIGIN === 'true',
): {
  apiBaseUrl?: string;
  error?: string;
} {
  try {
    const source = sameOrigin ? globalThis.location?.origin : value;
    return {
      apiBaseUrl: validateApiBaseUrl(
        source,
        sameOrigin ? 'VITE_API_SAME_ORIGIN' : 'VITE_API_BASE_URL',
      ),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Configuration Error' };
  }
}

/**
 * Google OAuth client ID for "Đăng nhập với Google" (Q-84). Public by design (it is in every Google sign-in page), so it
 * may be bundled; without it the Google button is simply not shown.
 */
export function readGoogleClientId(
  value: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID,
): string | undefined {
  const clientId = value?.trim();
  return clientId ? clientId : undefined;
}
