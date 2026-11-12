import { useMutation } from '@tanstack/react-query';
import type { RegisterRequest, VerifyOtpRequest } from '@spa/shared-types';
import { callAuth } from '@/lib/api/session';

/** UC-SPA-01 bước 1 (and "Gửi lại mã"): sends the code, nothing is created yet. */
export const useRequestRegistrationOtp = () =>
  useMutation({
    mutationFn: (values: RegisterRequest) => callAuth((api) => api.requestRegistrationOtp(values)),
  });

/** UC-SPA-01 bước 2: a correct code creates the customer account. */
export const useVerifyRegistrationOtp = () =>
  useMutation({
    mutationFn: (values: VerifyOtpRequest) => callAuth((api) => api.verifyRegistrationOtp(values)),
  });
