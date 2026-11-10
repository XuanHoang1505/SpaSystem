import type { OrderDetail, OrderStatus } from './orders';

/** Appointment contracts (docs/specs/bookings.md). Dates `yyyy-MM-dd` and times `HH:mm` are Vietnam local time (ADR-0003). */
export type AppointmentStatus =
  | 'held'
  | 'pending_confirmation'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'hold_expired';
export type AppointmentBookingSource = 'entitlement' | 'session' | 'book_now';
export type MyAppointmentScope = 'upcoming' | 'past' | 'cancelled';

export interface AppointmentService {
  id: string;
  name: string;
}

export interface AppointmentStaff {
  id: string;
  fullName: string;
}

export interface MyTreatmentSessionRef {
  id: string;
  sequenceNumber: number;
  customerPackageId: string;
  packageName: string;
}

export interface MyAppointmentOrder {
  id: string;
  code: string;
  status: OrderStatus;
}

/** A row of `GET /me/appointments`; the flags come from the API (UC-SPA-16), the client never recomputes them. */
export interface MyAppointmentListItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  holdExpiresAtUtc: string | null;
  service: AppointmentService;
  staff: AppointmentStaff;
  source: AppointmentBookingSource;
  treatmentSession: MyTreatmentSessionRef | null;
  canReschedule: boolean;
  canCancel: boolean;
}

export interface MyAppointment extends MyAppointmentListItem {
  cancelledAtUtc: string | null;
  cancellationReason: string | null;
  createdAtUtc: string;
  serviceEntitlementId: string | null;
  order: MyAppointmentOrder | null;
  /** Visit start minus the change cut-off; null when the status never allows a change. */
  changeDeadlineAtUtc: string | null;
  /** The customer's note while the visit is ahead; null once it is completed or missed. */
  note: string | null;
}

export interface MyAppointmentListParams {
  scope?: MyAppointmentScope;
  status?: AppointmentStatus;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

/** No `staffMemberId` means "any staff" (Q-26). */
export interface BookNowRequest {
  spaServiceId: string;
  date: string;
  startTime: string;
  staffMemberId?: string;
  promotionCode?: string;
  /** Optional note for the technician, at most 500 characters. */
  note?: string;
}

/** `created` is false when an `Idempotency-Key` matched an earlier book-now order. */
export interface BookNowResult {
  appointment: MyAppointment;
  order: OrderDetail;
  created: boolean;
}

/** Exactly one of a bought service or a package session. */
export interface BookAppointmentRequest {
  serviceEntitlementId?: string;
  treatmentSessionId?: string;
  date: string;
  startTime: string;
  staffMemberId?: string;
  note?: string;
}

export interface RescheduleAppointmentRequest {
  date: string;
  startTime: string;
  staffMemberId?: string;
}

/** The appointment held by a book-now order (`OrderDetail.appointment`). */
export interface OrderAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  staff: AppointmentStaff;
}
