/**
 * Domain types for Work Schedules (UC-SPA-23, docs/specs/staff.md).
 * Stored and transmitted with Vietnam local date/time (ADR-0003).
 */

import type {
  AppointmentCustomer,
  AppointmentService,
  AppointmentStatus,
  TreatmentSessionRef,
} from './bookings';

export type WorkScheduleStatus = 'active' | 'cancelled';

export interface WorkScheduleItem {
  id: string;
  staffMemberId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: WorkScheduleStatus;
}

export interface WorkScheduleQueryParams {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  staffMemberId?: string;
  status?: WorkScheduleStatus;
}

export interface CreateWorkScheduleRequest {
  staffMemberId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface CreateWorkScheduleBatchRequest {
  staffMemberIds: readonly string[];
  fromDate: string;
  toDate: string;
  weekdays: readonly number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string;
  endTime: string;
}

export interface SkippedShift {
  staffMemberId: string;
  staffName: string;
  date: string;
  reason: string;
}

export interface WorkScheduleBatchResult {
  created: readonly WorkScheduleItem[];
  skipped: readonly SkippedShift[];
}

export interface UpdateWorkScheduleRequest {
  date?: string;
  startTime?: string;
  endTime?: string;
}

export interface ChangeWorkScheduleStatusRequest {
  status: WorkScheduleStatus;
}

/** A row of `GET /me/work-schedules` (UC-SPA-24): the caller's own shift, cancelled ones included. */
export interface MyWorkSchedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: WorkScheduleStatus;
  /** Appointments inside the shift (pending, confirmed, completed, no-show; BR-STF-11). */
  appointmentCount: number;
}

/** An appointment inside a shift. */
export interface ShiftAppointment {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  customer: AppointmentCustomer;
  service: AppointmentService;
  treatmentSession: TreatmentSessionRef | null;
}

/** `GET /me/work-schedules/{id}`. */
export interface MyWorkScheduleDetail extends Omit<MyWorkSchedule, 'appointmentCount'> {
  appointments: readonly ShiftAppointment[];
}

/** Both dates required and inclusive, at most 42 days apart. */
export interface MyWorkScheduleParams {
  fromDate: string;
  toDate: string;
  status?: WorkScheduleStatus;
}
