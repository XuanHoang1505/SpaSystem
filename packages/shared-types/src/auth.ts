// Auth contracts (backend DTOs in Application/DTOs/Auth, docs/specs/auth.md). Times are UTC ISO strings.

export type UserRole = 'customer' | 'staff' | 'owner';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

/** `refreshToken` fields are null in cookie mode: the web keeps the token in an HttpOnly cookie. */
export interface AuthResult {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string | null;
  refreshTokenExpiresAtUtc: string | null;
  user: AuthUser;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface OtpSent {
  email: string;
  expiresAtUtc: string;
  resendAvailableAtUtc: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface PasswordResetToken {
  resetToken: string;
  expiresAtUtc: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}
