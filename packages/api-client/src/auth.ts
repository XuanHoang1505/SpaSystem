import type {
  ApiResponse,
  AuthResult,
  ForgotPasswordRequest,
  LoginRequest,
  OtpSent,
  PasswordResetToken,
  RefreshTokenRequest,
  RegisteredUser,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyOtpRequest,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/auth';

/** Error codes of /auth/* (docs/specs/auth.md); branch on these, never on the message. */
export const authErrorCodes = {
  invalidCredentials: 'invalid_credentials',
  accountLocked: 'account_locked',
  accountInactive: 'account_inactive',
  invalidRefreshToken: 'invalid_refresh_token',
  rateLimited: 'rate_limited',
  emailExists: 'email_exists',
  phoneExists: 'phone_exists',
  otpInvalid: 'otp_invalid',
  otpExpired: 'otp_expired',
  otpTooManyAttempts: 'otp_too_many_attempts',
  emailSendFailed: 'email_send_failed',
  invalidResetToken: 'invalid_reset_token',
  validationError: 'validation_error',
} as const;

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  login(body: LoginRequest) {
    return this.client.post<LoginRequest, ApiResponse<AuthResult>>(`${base}/login`, body);
  }
  /** Without a body the API reads the token from the cookie (cookie mode). */
  refresh(body?: RefreshTokenRequest) {
    return this.client.post<RefreshTokenRequest | undefined, ApiResponse<AuthResult>>(
      `${base}/refresh`,
      body,
    );
  }
  logout(body?: RefreshTokenRequest) {
    return this.client.post<RefreshTokenRequest | undefined, void>(`${base}/logout`, body);
  }
  requestRegistrationOtp(body: RegisterRequest) {
    return this.client.post<RegisterRequest, ApiResponse<OtpSent>>(
      `${base}/register/request-otp`,
      body,
    );
  }
  verifyRegistrationOtp(body: VerifyOtpRequest) {
    return this.client.post<VerifyOtpRequest, ApiResponse<RegisteredUser>>(
      `${base}/register/verify-otp`,
      body,
    );
  }
  requestPasswordResetOtp(body: ForgotPasswordRequest) {
    return this.client.post<ForgotPasswordRequest, ApiResponse<OtpSent>>(
      `${base}/forgot-password/request-otp`,
      body,
    );
  }
  verifyPasswordResetOtp(body: VerifyOtpRequest) {
    return this.client.post<VerifyOtpRequest, ApiResponse<PasswordResetToken>>(
      `${base}/forgot-password/verify-otp`,
      body,
    );
  }
  resetPassword(body: ResetPasswordRequest) {
    return this.client.post<ResetPasswordRequest, void>(`${base}/forgot-password/reset`, body);
  }
}
