import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiClientError } from '@spa/api-client';

const NO_CONNECTION = 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';
export const UNKNOWN_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại.';

const camelCase = (field: string) => field.charAt(0).toLowerCase() + field.slice(1);

/** Validation errors carry PascalCase `field` names (FluentValidation); their `code` is not stable, so it is unused. */
export function serverFieldErrors(error: unknown): { field: string; message: string }[] {
  if (!(error instanceof ApiClientError)) return [];
  return error.errors.flatMap((detail) =>
    detail.field ? [{ field: camelCase(detail.field), message: detail.message }] : [],
  );
}

/** Puts server field errors on the form; true when at least one matched a field of this form. */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  const matched = serverFieldErrors(error).filter((detail) =>
    (fields as readonly string[]).includes(detail.field),
  );
  matched.forEach((detail, index) =>
    setError(
      detail.field as Path<T>,
      { type: 'server', message: detail.message },
      { shouldFocus: index === 0 },
    ),
  );
  return matched.length > 0;
}

/** The text to show for a failed request: the server's own message, or a fixed one when there is none. */
export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) return UNKNOWN_ERROR;
  if (error.status === 0) return NO_CONNECTION;
  if (error.status >= 500 && error.status !== 503) return UNKNOWN_ERROR;
  return error.errors[0]?.message ?? UNKNOWN_ERROR;
}
