import { ApiClientError, careErrorCodes as codes } from '@spa/api-client';

export type CareErrorKind =
  | 'not_found'
  | 'not_assigned'
  | 'status_invalid'
  | 'too_early'
  | 'locked'
  | 'exists'
  | 'profile_missing'
  | 'profile_required'
  | 'entitlement'
  | 'allergy_exists'
  | 'allergy_missing'
  | 'not_in_care'
  | 'customer_missing'
  | 'validation'
  | 'other';

const kinds: Record<string, CareErrorKind> = {
  [codes.appointmentNotFound]: 'not_found',
  [codes.appointmentNotAssigned]: 'not_assigned',
  [codes.appointmentStatusInvalid]: 'status_invalid',
  [codes.skinProfileTooEarly]: 'too_early',
  [codes.completeTooEarly]: 'too_early',
  [codes.skinProfileLocked]: 'locked',
  [codes.skinProfileExists]: 'exists',
  [codes.skinProfileNotFound]: 'profile_missing',
  [codes.skinProfileRequired]: 'profile_required',
  [codes.entitlementStateInvalid]: 'entitlement',
  [codes.allergyExists]: 'allergy_exists',
  [codes.allergyNotFound]: 'allergy_missing',
  [codes.customerNotInCare]: 'not_in_care',
  [codes.customerNotFound]: 'customer_missing',
  [codes.validationError]: 'validation',
};

/** Decides how the care screens react to an error by its code (never by the message). */
export function careErrorKind(error: unknown): CareErrorKind {
  if (!(error instanceof ApiClientError)) return 'other';
  const code = error.errors[0]?.code;
  return (code && kinds[code]) || 'other';
}

/** The backend's Vietnamese message (it names the current status); undefined for non-API errors. */
export const careErrorMessage = (error: unknown): string | undefined =>
  error instanceof ApiClientError && error.status !== 0
    ? (error.errors[0]?.message ?? undefined)
    : undefined;
