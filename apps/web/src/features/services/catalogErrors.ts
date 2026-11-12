import { ApiClientError, catalogErrorCodes } from '@spa/api-client';
import { ApiConfigurationError } from '@/lib/errors/ApiConfigurationError';

export type CatalogErrorKind =
  'not_found' | 'invalid_filter' | 'configuration' | 'network' | 'server';

/** Decides the UI for a catalog request error by status and `errors[].code`, never by message. */
export function catalogErrorKind(error: unknown): CatalogErrorKind {
  if (error instanceof ApiConfigurationError) return 'configuration';
  if (!(error instanceof ApiClientError)) return 'server';
  if (error.status === 404) return 'not_found';
  if (error.status === 400 && error.errors[0]?.code === catalogErrorCodes.validationError)
    return 'invalid_filter';
  if (error.status === 0) return 'network';
  return 'server';
}

export const isNotFound = (error: unknown) =>
  error instanceof ApiClientError && error.status === 404;

/** Fixed copy for network and server errors (docs/specs/catalog.md). */
export const catalogErrorMessages = {
  network: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  server: 'Đã có lỗi xảy ra, vui lòng thử lại.',
} as const;
