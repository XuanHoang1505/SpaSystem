import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { OtpSent, PasswordResetToken } from '@spa/shared-types';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField/FormField';
import { applyServerFieldErrors, authErrorMessage, UNKNOWN_ERROR } from '../errors';
import { useRequestPasswordResetOtp, useVerifyPasswordResetOtp } from '../hooks/usePasswordReset';
import { otpSchema, type OtpValues } from '../schemas';
import { FormAlert } from './FormAlert';
import { OtpExpiry } from './OtpExpiry';
import { OtpInput } from './OtpInput';
import { ResendCodeButton } from './ResendCodeButton';

const blockedCodes = new Set<string>([
  authErrorCodes.accountLocked,
  authErrorCodes.accountInactive,
]);

/** SCR-W09 bước 2. Every OTP failure here is `otp_invalid` (E4), so the step never reveals an account. */
export function ForgotOtpStep({
  email,
  sent,
  onVerified,
  onResent,
  onChangeEmail,
}: {
  email: string;
  sent: OtpSent;
  onVerified: (reset: PasswordResetToken) => void;
  onResent: (sent: OtpSent) => void;
  onChangeEmail: () => void;
}) {
  const verify = useVerifyPasswordResetOtp();
  const resend = useRequestPasswordResetOtp();
  const [alert, setAlert] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const form = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ otp }) => {
    setAlert(null);
    try {
      onVerified(await verify.mutateAsync({ email, otp }));
    } catch (error) {
      const code = errorCodeOf(error);
      if (code === authErrorCodes.otpInvalid) {
        form.resetField('otp');
        form.setError(
          'otp',
          { type: code, message: authErrorMessage(error) },
          { shouldFocus: true },
        );
      } else if (code && blockedCodes.has(code)) {
        setBlocked(true);
        setAlert(authErrorMessage(error));
      } else if (applyServerFieldErrors(error, form.setError, ['otp'])) return;
      else if (
        code === authErrorCodes.rateLimited ||
        (error instanceof ApiClientError && error.status === 0)
      )
        setAlert(authErrorMessage(error));
      else toast.error(UNKNOWN_ERROR);
    }
  });

  const onResend = async () => {
    setAlert(null);
    try {
      const next = await resend.mutateAsync({ email });
      form.reset({ otp: '' });
      onResent(next);
      toast.success('Nếu email có tài khoản, mã mới đã được gửi.');
    } catch (error) {
      setAlert(authErrorMessage(error));
    }
  };

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Nếu <strong className="text-foreground">{email}</strong> thuộc một tài khoản đang hoạt động,
        chúng tôi đã gửi mã gồm 6 chữ số tới email này.
      </p>
      <FormAlert message={alert} />
      {!blocked && (
        <form noValidate className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <FormField label="Mã OTP" error={errors.otp?.message} required>
              <OtpInput {...form.register('otp')} />
            </FormField>
            <OtpExpiry expiresAtUtc={sent.expiresAtUtc} />
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting || verify.isPending}>
            Xác nhận mã
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Button type="button" variant="link" className="h-auto px-0" onClick={onChangeEmail}>
              Đổi email
            </Button>
            <ResendCodeButton
              availableAtUtc={sent.resendAvailableAtUtc}
              onResend={() => void onResend()}
              loading={resend.isPending}
            />
          </div>
        </form>
      )}
    </>
  );
}
