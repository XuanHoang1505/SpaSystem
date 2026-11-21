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

/** `POST /auth/google` (web only, Q-84): `idToken` is the `credential` Google Identity Services returns. */
export interface GoogleSignInRequest {
  idToken: string;
}

/** First Google sign-in: no account matches yet, so the web asks for a phone number and sends the token back. */
export interface GoogleSignup {
  signupToken: string;
  expiresAtUtc: string;
  email: string;
  fullName: string;
}

/** Either `session` (signed in) or, when `profileRequired`, `signup` for `POST /auth/google/complete`. */
export interface GoogleSignInResult {
  profileRequired: boolean;
  session: AuthResult | null;
  signup: GoogleSignup | null;
}

export interface GoogleSignupCompleteRequest {
  signupToken: string;
  fullName: string;
  phoneNumber: string;
}
