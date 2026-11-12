import type { SkinType } from './care';
import type { AppointmentStatus } from './bookings';
import type { PaginationParams } from './index';
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

export interface TreatmentCustomerDto {
  id: string;
  fullName: string;
  phoneNumber: string | null;
}

export interface TreatmentNextSessionDto {
  id: string;
  sequenceNumber: number;
  serviceName: string;
  status: TreatmentSessionStatus;
  appointment: SessionAppointment | null;
}

export interface TreatmentPlanListItemDto {
  id: string;
  customer: TreatmentCustomerDto;
  packageName: string;
  status: TreatmentPlanStatus;
  packageStatus: CustomerPackageStatus;
  expiresAtUtc: string | null;
  totalSessions: number;
  usedSessions: number;
  bookedSessions: number;
  primaryStaff: StaffRef | null;
  nextSession: TreatmentNextSessionDto | null;
  purchasedAtUtc: string;
}

export interface TreatmentSkinProfileDto {
  id: string;
  appointmentId: string;
  sequenceNumber: number;
  assessedAtUtc: string;
  skinType: SkinType;
  mainConcerns: string | null;
  careGoals: string | null;
  recommendedTreatment: string | null;
  assessedBy: StaffRef;
}

export interface CareHistoryEntryDto {
  appointmentId: string;
  sequenceNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  staff: StaffRef;
  result: string | null;
  skinProfileId: string | null;
}

export interface TreatmentSessionDto {
  id: string;
  sequenceNumber: number;
  spaServiceId: string;
  serviceName: string;
  durationMinutes: number;
  status: TreatmentSessionStatus;
  note: string | null;
  completedAtUtc: string | null;
  appointment: SessionAppointment | null;
}

export interface TreatmentPlanDto {
  id: string;
  customer: TreatmentCustomerDto;
  packageName: string;
  status: TreatmentPlanStatus;
  packageStatus: CustomerPackageStatus;
  expiresAtUtc: string | null;
  totalSessions: number;
  usedSessions: number;
  bookedSessions: number;
  primaryStaff: StaffRef | null;
  nextSession: TreatmentNextSessionDto | null;
  purchasedAtUtc: string;
  customerPackageId: string;
  goal: string | null;
  note: string | null;
  statusReason: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  canEdit: boolean;
  canManage: boolean;
  hasAllergies: boolean;
  sessions: readonly TreatmentSessionDto[];
  skinProfiles: readonly TreatmentSkinProfileDto[];
  careHistory: readonly CareHistoryEntryDto[];
}

export interface UpdateTreatmentPlanRequest {
  goal?: string | null;
  expectedEndDate?: string | null;
  note?: string | null;
}

export interface UpdateTreatmentSessionRequest {
  note?: string | null;
}

export interface AssignTreatmentStaffRequest {
  staffMemberId?: string | null;
}

export interface TreatmentReasonRequest {
  reason?: string | null;
}

export interface TreatmentSearchParams extends PaginationParams {
  search?: string;
  customerId?: string;
  status?: TreatmentPlanStatus;
  primaryStaffMemberId?: string;
}
