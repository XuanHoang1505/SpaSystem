import { useMutation } from '@tanstack/react-query';
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyOtpRequest,
} from '@spa/shared-types';
import { callAuth, callAuthVoid } from '@/lib/api/session';

/** UC-SPA-03 bước 1: always 202 with the same answer, whether or not the email has an account. */
export const useRequestPasswordResetOtp = () =>
  useMutation({
    mutationFn: (values: ForgotPasswordRequest) =>
      callAuth((api) => api.requestPasswordResetOtp(values)),
  });

/** UC-SPA-03 bước 2: a correct code gives a short-lived reset token, kept only in component state. */
export const useVerifyPasswordResetOtp = () =>
  useMutation({
    mutationFn: (values: VerifyOtpRequest) => callAuth((api) => api.verifyPasswordResetOtp(values)),
  });

/** UC-SPA-03 bước 3. */
export const useResetPassword = () =>
  useMutation({
    mutationFn: (values: ResetPasswordRequest) => callAuthVoid((api) => api.resetPassword(values)),
  });
