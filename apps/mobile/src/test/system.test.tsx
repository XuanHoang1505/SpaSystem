import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SystemStatus } from '@components/common/SystemStatus';
import { readEnvironment } from '@/config/env';
const originalFetch = global.fetch;
const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example';
});
afterEach(() => {
  global.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <SystemStatus />
    </QueryClientProvider>,
  );
}
function response(body: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) } as Response;
}
test('SystemStatus loading and online', async () => {
  global.fetch = jest
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(
        response(
          url.endsWith('/health/live')
            ? { status: 'Healthy' }
            : { success: true, data: { application: 'API', status: 'Healthy', utcTime: 'now' } },
        ),
      ),
    );
  mount();
  expect(screen.getByText(/Loading/)).toBeOnTheScreen();
  await waitFor(() => expect(screen.getByText(/API Online/)).toBeOnTheScreen());
});
test('SystemStatus offline after limited retries', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
  mount();
  await waitFor(() => expect(screen.getByText(/API Offline/)).toBeOnTheScreen());
  expect(global.fetch).toHaveBeenCalledTimes(4);
});
test('Missing environment reports Configuration Error without network', () => {
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  global.fetch = jest.fn();
  mount();
  expect(screen.getByText(/Configuration Error/)).toBeOnTheScreen();
  expect(global.fetch).not.toHaveBeenCalled();
});
test('Environment rejects invalid URL', () => {
  expect(readEnvironment('ftp://example').error).toContain('Configuration Error');
});
