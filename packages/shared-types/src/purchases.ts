import type { AppointmentStatus } from './bookings';
import type { StaffRef, TreatmentPlanStatus } from './treatments';

/** `GET /me/purchases` (docs/specs/purchases-treatments.md). Statuses are the effective ones (BR-TRT-04). */
export type EntitlementStatus = 'available' | 'booked' | 'used' | 'expired';
export type CustomerPackageStatus = 'active' | 'completed' | 'expired' | 'cancelled';

export interface PurchaseOrderRef {
  id: string;
  code: string;
}

export interface PurchaseAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
}

export interface PurchasedService {
  id: string;
  spaServiceId: string;
  serviceName: string;
  imageUrl: string | null;
  durationMinutes: number;
  status: EntitlementStatus;
  expiresAtUtc: string | null;
  purchasedAtUtc: string;
  canBook: boolean;
  appointment: PurchaseAppointment | null;
  order: PurchaseOrderRef;
}

/** BR-TRT-05: the session to book next and the earliest date it may be booked for. */
export interface NextSession {
  id: string;
  sequenceNumber: number;
  spaServiceId: string;
  serviceName: string;
  durationMinutes: number;
  canBook: boolean;
  earliestDate: string;
}

export interface PackageItemProgress {
  spaServiceId: string;
  serviceName: string;
  totalSessions: number;
  completedSessions: number;
  bookedSessions: number;
}

export interface PurchasedPackage {
  id: string;
  servicePackageId: string;
  packageName: string;
  imageUrl: string | null;
  status: CustomerPackageStatus;
  purchasedAtUtc: string;
  activatedAtUtc: string | null;
  expiresAtUtc: string | null;
  totalSessions: number;
  usedSessions: number;
  bookedSessions: number;
  treatmentPlan: { id: string; status: TreatmentPlanStatus };
  nextSession: NextSession | null;
  /** Filled only by the detail endpoint. */
  items: readonly PackageItemProgress[] | null;
  order: PurchaseOrderRef;
}

export interface Purchases {
  services: readonly PurchasedService[];
  packages: readonly PurchasedPackage[];
}

export type ServiceHistorySource = 'service' | 'package';

export interface ServiceHistoryQuery {
  fromDate?: string;
  toDate?: string;
  spaServiceId?: string;
  status?: AppointmentStatus;
}

export interface ServiceHistoryItem {
  appointmentId: string;
  status: AppointmentStatus;
  date: string;
  startTime: string;
  endTime: string;
  spaServiceId: string;
  serviceName: string;
  staff: StaffRef;
  source: ServiceHistorySource;
  treatmentPlanId?: string;
  packageName?: string;
  sequenceNumber?: number;
}

export interface ServiceHistoryDetail extends ServiceHistoryItem {
  durationMinutes: number;
  result: string | null;
  completedAtUtc?: string | null;
  serviceEntitlementId?: string | null;
  treatmentSessionId?: string | null;
  order?: PurchaseOrderRef | null;
}
