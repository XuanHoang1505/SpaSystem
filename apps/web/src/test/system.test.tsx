import { screen, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, test, expect } from 'vitest';
import { SystemStatus } from '@components/common/SystemStatus/SystemStatus';
import { renderWithQuery } from './utils';
import { readEnvironment } from '@/config/env';

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', 'https://api.example'));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test('SystemStatus shows loading followed by online', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockImplementation(
      async (input) =>
        new Response(
          JSON.stringify(
            String(input).endsWith('/health/live')
              ? { status: 'Healthy' }
              : {
                  success: true,
                  data: { application: 'API', status: 'Healthy', utcTime: 'now' },
                },
          ),
        ),
    ),
  );
  renderWithQuery(<SystemStatus />);
  expect(screen.getByText(/Loading/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/API Online/)).toBeInTheDocument());
});

test('SystemStatus shows offline after one retry', async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Offline'));
  vi.stubGlobal('fetch', fetcher);
  renderWithQuery(<SystemStatus />);
  await waitFor(() => expect(screen.getByText(/API Offline/)).toBeInTheDocument(), {
    timeout: 3000,
  });
  expect(fetcher).toHaveBeenCalledTimes(4);
});

test('Missing configuration is visible and does not call network', () => {
  vi.stubEnv('VITE_API_BASE_URL', '');
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  renderWithQuery(<SystemStatus />);
  expect(screen.getByText(/Configuration Error/)).toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});

test('Environment validates HTTP(S) and avoids fallback', () => {
  expect(readEnvironment('ftp://example').error).toContain('Configuration Error');
  expect(readEnvironment('https://example/').apiBaseUrl).toBe('https://example');
});
