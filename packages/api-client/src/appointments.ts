import type {
  ApiResponse,
  BookAppointmentRequest,
  BookNowRequest,
  BookNowResult,
  MyAppointment,
  MyAppointmentListItem,
  MyAppointmentListParams,
  PagedResponse,
  RescheduleAppointmentRequest,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/me/appointments';

/** Error codes of the customer appointment endpoints (docs/specs/bookings.md); branch on these, never on the message. */
export const appointmentErrorCodes = {
  slotUnavailable: 'slot_unavailable',
  customerBusy: 'customer_busy',
  outsideWorkSchedule: 'outside_work_schedule',
  appointmentInPast: 'appointment_in_past',
  slotTooSoon: 'slot_too_soon',
  staffNotQualified: 'staff_not_qualified',
  staffNotFound: 'staff_not_found',
  sessionTooEarly: 'session_too_early',
  sessionTooLate: 'session_too_late',
  entitlementNotEligible: 'entitlement_not_eligible',
  entitlementNotFound: 'entitlement_not_found',
  treatmentSessionNotFound: 'treatment_session_not_found',
  serviceNotFound: 'service_not_found',
  appointmentNotFound: 'appointment_not_found',
  changeWindowPassed: 'change_window_passed',
  appointmentStatusInvalid: 'appointment_status_invalid',
  promotionInvalid: 'promotion_invalid',
  promotionNotApplicable: 'promotion_not_applicable',
  orderAmountTooSmall: 'order_amount_too_small',
  validationError: 'validation_error',
} as const;

/** UC-SPA-15, 16: the signed-in customer's appointments. */
export class AppointmentsApi {
  constructor(private readonly client: ApiClient) {}

  list(params: MyAppointmentListParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<MyAppointmentListItem>>>(base, {
      query: { ...params },
      signal,
    });
  }

  get(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<MyAppointment>>(`${base}/${encodeURIComponent(id)}`, {
      signal,
    });
  }

  /** Holds the slot and creates its order; the same key returns the earlier result (BR-ORD-08). */
  bookNow(body: BookNowRequest, idempotencyKey: string) {
    return this.client.post<BookNowRequest, ApiResponse<BookNowResult>>(`${base}/book-now`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  book(body: BookAppointmentRequest) {
    return this.client.post<BookAppointmentRequest, ApiResponse<MyAppointment>>(base, body);
  }

  reschedule(id: string, body: RescheduleAppointmentRequest) {
    return this.client.post<RescheduleAppointmentRequest, ApiResponse<MyAppointment>>(
      `${base}/${encodeURIComponent(id)}/reschedule`,
      body,
    );
  }

  cancel(id: string, reason: string) {
    return this.client.post<{ reason: string }, ApiResponse<MyAppointment>>(
      `${base}/${encodeURIComponent(id)}/cancel`,
      { reason },
    );
  }
}

export const appointmentsQueryKeys = {
  all: ['appointments'] as const,
  list: (params: MyAppointmentListParams) => ['appointments', 'list', params] as const,
  detail: (id: string) => ['appointments', 'detail', id] as const,
};
