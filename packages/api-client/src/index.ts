import type {
  ApiResponse,
  ErrorDetail,
  HealthResponse,
  SystemStatusResponse,
} from '@spa/shared-types';

export type QueryValue = string | number | boolean | null | undefined;
export interface RequestOptions {
  query?: Record<string, QueryValue | readonly QueryValue[]>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}
export interface ApiClientOptions {
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  fetch?: typeof fetch;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly errors: readonly ErrorDetail[];
  readonly traceId?: string;
  constructor(
    message: string,
    status: number,
    errors: readonly ErrorDetail[] = [],
    traceId?: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
    this.traceId = traceId;
  }
}

function errorDetails(value: unknown): ErrorDetail[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ErrorDetail =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.code === 'string' &&
      typeof item.message === 'string',
  );
}

export function validateApiBaseUrl(value: string | undefined, variable: string): string {
  if (!value?.trim()) throw new Error(`Configuration Error: ${variable} is required.`);
  const normalized = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/\s?#]+(?:\/[^\s?#]*)?$/.test(normalized))
    throw new Error(
      `Configuration Error: ${variable} must be an absolute HTTP(S) URL without query or fragment.`,
    );
  return normalized;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  constructor(
    baseUrl: string,
    private readonly options: ApiClientOptions = {},
  ) {
    this.baseUrl = validateApiBaseUrl(baseUrl, 'baseUrl');
    this.fetcher = options.fetch ?? globalThis.fetch;
  }
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }
  post<TRequest, TResponse>(
    path: string,
    body: TRequest,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>('POST', path, body, options);
  }
  put<TRequest, TResponse>(
    path: string,
    body: TRequest,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>('PUT', path, body, options);
  }
  patch<TRequest, TResponse>(
    path: string,
    body: TRequest,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return this.request<TResponse>('PATCH', path, body, options);
  }
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//') || /[?#]/.test(path))
      throw new ApiClientError(
        'Use a relative API path starting with / and pass query separately.',
        0,
      );
    const query = Object.entries(options.query ?? {})
      .flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value])
          .filter((item) => item !== null && item !== undefined)
          .map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`),
      )
      .join('&');
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}${query ? `?${query}` : ''}`, {
        method,
        signal: options.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(await this.options.headers?.()),
          ...options.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      if (options.signal?.aborted || (cause instanceof Error && cause.name === 'AbortError'))
        throw cause;
      throw new ApiClientError('Unable to connect to the API.', 0, [], undefined, cause);
    }
    let raw: string;
    try {
      raw = await response.text();
    } catch (cause) {
      if (options.signal?.aborted || (cause instanceof Error && cause.name === 'AbortError'))
        throw cause;
      throw new ApiClientError(
        'Unable to read the API response.',
        response.status,
        [],
        undefined,
        cause,
      );
    }
    let data: unknown;
    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch (cause) {
        throw new ApiClientError(
          response.ok ? 'The API returned invalid JSON.' : `HTTP ${response.status}`,
          response.status,
          [],
          undefined,
          cause,
        );
      }
    }
    if (!response.ok) {
      const error =
        typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
      throw new ApiClientError(
        typeof error.message === 'string' ? error.message : `HTTP ${response.status}`,
        response.status,
        errorDetails(error.errors),
        typeof error.traceId === 'string' ? error.traceId : undefined,
      );
    }
    // Empty (including 204) responses resolve as undefined; callers should use void.
    return data as T;
  }
}

export class SystemApi {
  constructor(private readonly client: ApiClient) {}
  ping(signal?: AbortSignal) {
    return this.client.get<ApiResponse<SystemStatusResponse>>('/api/v1/system/ping', { signal });
  }
  healthLive(signal?: AbortSignal) {
    return this.client.get<HealthResponse>('/health/live', { signal });
  }
}

export const systemQueryKeys = { status: ['system', 'status'] as const };
export const systemQueryPolicy = { staleTime: 60_000, retry: 1 } as const;
export async function checkSystemStatus(
  api: SystemApi,
  signal?: AbortSignal,
): Promise<SystemStatusResponse> {
  const [ping, health] = await Promise.all([api.ping(signal), api.healthLive(signal)]);
  if (!ping.success || !ping.data || health.status !== 'Healthy')
    throw new ApiClientError('The API is not healthy.', 503);
  return ping.data;
}
