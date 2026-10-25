import { validateApiBaseUrl } from '@spa/api-client';

export function readEnvironment(value: string | undefined = import.meta.env.VITE_API_BASE_URL): {
  apiBaseUrl?: string;
  error?: string;
} {
  try {
    return { apiBaseUrl: validateApiBaseUrl(value, 'VITE_API_BASE_URL') };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Configuration Error' };
  }
}
