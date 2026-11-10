import type { UserRole } from './auth';

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
