import { ApiClientError, appointmentErrorCodes as codes } from '@spa/api-client';

export type BookingErrorKind =
  | 'slot_taken'
  | 'in_past'
  | 'too_soon'
  | 'staff'
  | 'session_too_early'
  | 'session_too_late'
  | 'not_eligible'
  | 'service_gone'
  | 'promotion'
  | 'amount_too_small'
  | 'change_window'
  | 'status_invalid'
  | 'not_found'
  | 'validation'
  | 'network'
  | 'other';

const kinds: Record<string, BookingErrorKind> = {
  [codes.slotUnavailable]: 'slot_taken',
  [codes.customerBusy]: 'slot_taken',
  [codes.outsideWorkSchedule]: 'slot_taken',
  [codes.appointmentInPast]: 'in_past',
  [codes.slotTooSoon]: 'too_soon',
  [codes.staffNotQualified]: 'staff',
  [codes.staffNotFound]: 'staff',
  [codes.sessionTooEarly]: 'session_too_early',
  [codes.sessionTooLate]: 'session_too_late',
  [codes.entitlementNotEligible]: 'not_eligible',
  [codes.entitlementNotFound]: 'not_eligible',
  [codes.treatmentSessionNotFound]: 'not_eligible',
  [codes.serviceNotFound]: 'service_gone',
  [codes.promotionInvalid]: 'promotion',
  [codes.promotionNotApplicable]: 'promotion',
  [codes.orderAmountTooSmall]: 'amount_too_small',
  [codes.changeWindowPassed]: 'change_window',
  [codes.appointmentStatusInvalid]: 'status_invalid',
  [codes.appointmentNotFound]: 'not_found',
  [codes.validationError]: 'validation',
};

/** Decides how the UI reacts to a booking error by its code (never by the message). */
export function bookingErrorKind(error: unknown): BookingErrorKind {
  if (!(error instanceof ApiClientError)) return 'other';
  if (error.status === 0) return 'network';
  const code = error.errors[0]?.code;
  return (code && kinds[code]) || 'other';
}

/** The backend's own Vietnamese message (it names the reason or the date); undefined for non-API errors. */
export const errorMessageOf = (error: unknown): string | undefined =>
  error instanceof ApiClientError && error.status !== 0
    ? (error.errors[0]?.message ?? undefined)
    : undefined;
