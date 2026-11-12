import type {
  AllergySeverity,
  AppointmentCustomer,
  AppointmentDetail,
  AppointmentService,
  AppointmentStaff,
  AppointmentStatus,
  TreatmentSessionRef,
} from './bookings';
import type { CustomerPackageStatus } from './purchases';

/** Skin type of a skin profile (backend `SkinType`, snake_case on the wire). */
export type SkinType = 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive';

/** Statuses a staff member can filter by: never `held`/`hold_expired` (BR-STF-10, Q-33). */
export type AssignedAppointmentStatus = Exclude<AppointmentStatus, 'held' | 'hold_expired'>;

export interface AssignedTreatmentSession {
  id: string;
  sequenceNumber: number;
  totalSessions: number;
  packageName: string;
}

/** A row of `GET /me/assigned-appointments` (UC-SPA-25), ordered by `date, startTime`, not paged. */
export interface AssignedAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  customer: AppointmentCustomer;
  service: AppointmentService;
  treatmentSession: AssignedTreatmentSession | null;
  hasAllergies: boolean;
  hasSkinProfile: boolean;
}

/** Both dates are required and inclusive, at most `Booking:MaxQueryRangeDays` (42) days apart. */
export interface AssignedAppointmentListParams {
  fromDate: string;
  toDate: string;
  status?: AssignedAppointmentStatus;
}

/** `GET /appointments/{id}/skin-profile` (UC-SPA-27). */
export interface SkinProfile {
  id: string;
  appointmentId: string;
  customerId: string;
  assessedBy: AppointmentStaff;
  assessedAtUtc: string;
  skinType: SkinType;
  mainConcerns: string | null;
  currentProducts: string | null;
  careGoals: string | null;
  recommendedTreatment: string | null;
  note: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

/** Body of `POST /appointments/{id}/skin-profile` and `PUT /skin-profiles/{id}` (every field replaced). */
export interface SaveSkinProfileRequest {
  skinType: SkinType;
  mainConcerns: string | null;
  currentProducts: string | null;
  careGoals: string | null;
  recommendedTreatment: string | null;
  note: string | null;
}

/** Body of `POST /customers/{id}/allergies` and `PUT /customers/{id}/allergies/{allergyId}`. */
export interface SaveAllergyRequest {
  allergen: string;
  severity: AllergySeverity;
  note: string | null;
}

/** The package after a session was completed (BR-TRT-03). */
export interface PackageProgress {
  customerPackageId: string;
  packageName: string;
  usedSessions: number;
  totalSessions: number;
  status: CustomerPackageStatus;
}

/** A row of `GET /me/care-history` (UC-SPA-26): a visit the caller completed, newest first. */
export interface CareHistoryItem {
  appointmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  customer: AppointmentCustomer;
  service: AppointmentService;
  treatmentSession: TreatmentSessionRef | null;
  hasAllergies: boolean;
  skinProfileId: string | null;
}

/** Every filter is optional; `search` matches the customer's name (no accents) or phone. */
export interface CareHistoryParams {
  search?: string;
  fromDate?: string;
  toDate?: string;
  customerId?: string;
  pageNumber?: number;
  pageSize?: number;
}

/** Response of `POST /appointments/{id}/complete` (UC-SPA-28). */
export interface CompleteAppointmentResult {
  appointment: AppointmentDetail;
  packageProgress: PackageProgress | null;
}
