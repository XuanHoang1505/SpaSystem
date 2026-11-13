import type { AppointmentStatus } from './bookings';
import type { CatalogStatus } from './catalog';
import type { PaginationParams } from './index';
import type { UserStatus } from './users';

/** What guests and customers see in `GET /staff` (no contact details, docs/specs/staff.md). */
export interface PublicStaffMember {
  id: string;
  fullName: string;
  specialty: string | null;
  avatarUrl: string | null;
  /** Names of verified, public, unexpired certifications (BR-STF-13). */
  certifications: readonly string[];
}

export type StaffStatusFilter = 'working' | 'resigned';

export interface StaffServiceItem {
  id: string;
  name: string;
  status: CatalogStatus;
}

/** Owner view of one staff member in `GET /staff` (UC-SPA-22). */
export interface StaffListItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  specialty: string | null;
  hireDate: string; // YYYY-MM-DD
  resignationDate: string | null; // YYYY-MM-DD
  accountStatus: UserStatus;
  services: readonly StaffServiceItem[];
  /** Certifications declared by the staff member and waiting for the owner (BR-STF-14). */
  pendingCertificationCount: number;
}

/** Full staff member detail returned by `GET /staff/{id}` and write operations. */
export interface StaffDetail {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string | null;
  specialty: string | null;
  hireDate: string;
  resignationDate: string | null;
  accountStatus: UserStatus;
  services: readonly StaffServiceItem[];
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  hireDate?: string;
  specialty?: string;
  spaServiceIds?: readonly string[];
}

export interface UpdateStaffRequest {
  fullName: string;
  phoneNumber: string;
  hireDate?: string;
  specialty?: string;
}

export interface UpdateStaffServicesRequest {
  spaServiceIds: readonly string[];
}

export interface ResignStaffRequest {
  resignationDate?: string;
}

export interface AppointmentToReassign {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  customerId: string;
  customerName: string;
}

export interface ResignationResult {
  staff: StaffDetail;
  appointmentsToReassign: readonly AppointmentToReassign[];
}

export interface StaffFilterParams extends PaginationParams {
  status?: StaffStatusFilter;
  spaServiceId?: string;
}

/** Validity on the Vietnam date, computed by the server (BR-STF-13). */
export type StaffCertificationStatus = 'valid' | 'expiring_soon' | 'expired';

/** Owner review of a certification (BR-STF-14). */
export type CertificationVerificationStatus = 'pending' | 'verified' | 'rejected';

/** `GET /staff/{id}/certifications` and `GET /me/certifications`, most urgent first. */
export interface StaffCertification {
  id: string;
  name: string;
  issuer: string | null;
  credentialNumber: string | null;
  issuedOn: string | null; // YYYY-MM-DD
  expiresOn: string | null; // YYYY-MM-DD, null = no expiry
  isPublic: boolean;
  note: string | null;
  /** Photo of the certificate on Cloudinary (public URL for now, Q-74); null = none. */
  imageUrl: string | null;
  status: StaffCertificationStatus;
  verificationStatus: CertificationVerificationStatus;
  rejectionReason: string | null;
  reviewedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

/** Body of POST/PUT; every field is replaced. */
export interface SaveStaffCertificationRequest {
  name: string;
  issuer: string | null;
  credentialNumber: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  isPublic: boolean;
  note: string | null;
}
