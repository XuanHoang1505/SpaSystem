import type { AppointmentStatus } from './bookings';
import type { CustomerPackageStatus, PurchaseOrderRef } from './purchases';

/** `GET /me/treatments/{id}` for the customer (UC-SPA-19, read only). */
export type TreatmentPlanStatus =
  'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
export type TreatmentSessionStatus = 'not_booked' | 'booked' | 'completed' | 'skipped';

export interface StaffRef {
  id: string;
  fullName: string;
}

export interface SessionAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  staff: StaffRef;
}

export interface MyTreatmentSession {
  id: string;
  sequenceNumber: number;
  spaServiceId: string;
  serviceName: string;
  durationMinutes: number;
  status: TreatmentSessionStatus;
  completedAtUtc: string | null;
  /** BR-TRT-10: from the same rule as booking. */
  canBook: boolean;
  reason: string | null;
  earliestDate: string | null;
  appointment: SessionAppointment | null;
  /** Only the session detail endpoint, and only for a completed session. */
  result: string | null;
}

export interface MyTreatmentNextSession {
  id: string;
  sequenceNumber: number;
  serviceName: string;
  canBook: boolean;
  earliestDate: string | null;
}

export interface MyTreatmentListItem {
  id: string;
  customerPackageId: string;
  packageName: string;
  imageUrl: string | null;
  status: TreatmentPlanStatus;
  packageStatus: CustomerPackageStatus;
  expiresAtUtc: string | null;
  totalSessions: number;
  usedSessions: number;
  bookedSessions: number;
  primaryStaff: StaffRef | null;
  nextSession: MyTreatmentNextSession | null;
}

export interface MyTreatmentPlan {
  id: string;
  customerPackageId: string;
  packageName: string;
  imageUrl: string | null;
  status: TreatmentPlanStatus;
  packageStatus: CustomerPackageStatus;
  expiresAtUtc: string | null;
  totalSessions: number;
  usedSessions: number;
  bookedSessions: number;
  primaryStaff: StaffRef | null;
  nextSession: MyTreatmentNextSession | null;
  goal: string | null;
  statusReason: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  purchasedAtUtc: string;
  order: PurchaseOrderRef;
  sessions: readonly MyTreatmentSession[];
}
