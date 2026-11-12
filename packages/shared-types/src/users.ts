import type { UserRole } from './auth';
import type { PaginationParams } from './index';

export type Gender = 'male' | 'female' | 'other';
export type UserStatus = 'active' | 'locked' | 'inactive';

export interface MeDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  createdAtUtc: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  gender: Gender | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AvatarUrlDto {
  avatarUrl: string;
}

/** A row of `GET /users` (UC-SPA-05), newest first. */
export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAtUtc: string;
}

/** Staff-only facts, so the owner sees why an account is inactive (resigned). */
export interface UserStaffInfo {
  hireDate: string;
  resignationDate: string | null;
}

/** `GET /users/{id}` and the result of `PUT /users/{id}`. */
export interface UserDetail extends UserListItem {
  dateOfBirth: string | null;
  gender: Gender | null;
  updatedAtUtc: string | null;
  staff: UserStaffInfo | null;
}

export interface UserFilterParams extends PaginationParams {
  role?: UserRole;
  status?: UserStatus;
}

/** `PATCH /users/{id}/status`: only `active` or `locked`. */
export interface ChangeUserStatusRequest {
  status: Extract<UserStatus, 'active' | 'locked'>;
}
