import { describe, it, expect, vi } from 'vitest';
import {
  ApiClient,
  ApiClientError,
  SystemApi,
  checkSystemStatus,
  validateApiBaseUrl,
} from './index';

describe('ApiClient', () => {
  it('parses JSON and sends query values, headers and AbortSignal', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'));
    const client = new ApiClient('https://api.example/', {
      fetch: fetcher,
      headers: async () => ({ 'X-Client': 'test' }),
    });
    const controller = new AbortController();
    expect(
      await client.get('/test', {
        query: { search: 'da đẹp', page: 2, flag: false, absent: undefined, tag: ['a', 'b'] },
        signal: controller.signal,
      }),
    ).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example/test?search=da%20%C4%91%E1%BA%B9p&page=2&flag=false&tag=a&tag=b',
      expect.objectContaining({
        signal: controller.signal,
        headers: { Accept: 'application/json', 'X-Client': 'test' },
      }),
    );
  });
  it('normalizes HTTP errors and preserves trace ID', async () => {
    const client = new ApiClient('https://api.example', {
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(
            '{"message":"Invalid","errors":[{"code":"invalid","message":"Invalid"}],"traceId":"trace"}',
            { status: 400 },
          ),
        ),
    });
    await expect(client.get('/test')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 400,
      message: 'Invalid',
      traceId: 'trace',
      errors: [{ code: 'invalid', message: 'Invalid' }],
    });
  });
  it('handles empty responses', async () => {
    const client = new ApiClient('https://api.example', {
      fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })),
    });
    expect(await client.delete<void>('/test')).toBeUndefined();
  });
  it.each(['post', 'put', 'patch'] as const)('sends JSON with %s', async (method) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'));
    const client = new ApiClient('https://api.example', { fetch: fetcher });
    await client[method]('/test', { name: 'Như Nguyệt' });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example/test',
      expect.objectContaining({ method: method.toUpperCase(), body: '{"name":"Như Nguyệt"}' }),
    );
  });
  it('normalizes network and invalid JSON errors', async () => {
    await expect(
      new ApiClient('https://api.example', {
        fetch: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network')),
      }).get('/test'),
    ).rejects.toBeInstanceOf(ApiClientError);
    await expect(
      new ApiClient('https://api.example', {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response('invalid')),
      }).get('/test'),
    ).rejects.toMatchObject({ message: 'The API returned invalid JSON.' });
  });
  it('preserves cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = new DOMException('Aborted', 'AbortError');
    const client = new ApiClient('https://api.example', {
      fetch: vi.fn<typeof fetch>().mockRejectedValue(aborted),
    });
    await expect(client.get('/test', { signal: controller.signal })).rejects.toBe(aborted);
  });
  it('normalizes response body read failures', async () => {
    const response = new Response('{}');
    vi.spyOn(response, 'text').mockRejectedValue(new TypeError('Stream failed'));
    await expect(
      new ApiClient('https://api.example', {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(response),
      }).get('/test'),
    ).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Unable to read the API response.',
    });
  });
  it('checks both foundation endpoints', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          '{"success":true,"data":{"application":"API","status":"Healthy","utcTime":"now"}}',
        ),
      )
      .mockResolvedValueOnce(new Response('{"status":"Healthy"}'));
    expect(
      await checkSystemStatus(
        new SystemApi(new ApiClient('https://api.example', { fetch: fetcher })),
      ),
    ).toMatchObject({ status: 'Healthy' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects missing and invalid URLs and absolute endpoint paths', async () => {
    expect(() => validateApiBaseUrl(undefined, 'URL')).toThrow('Configuration Error');
    expect(() => new ApiClient('ftp://api.example')).toThrow('HTTP(S)');
    await expect(
      new ApiClient('https://api.example').get('//other.example'),
    ).rejects.toBeInstanceOf(ApiClientError);
  });
});
