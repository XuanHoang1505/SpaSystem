import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { OtpSent } from '@spa/shared-types';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField/FormField';
import { applyServerFieldErrors, authErrorMessage, UNKNOWN_ERROR } from '../errors';
import { useRequestRegistrationOtp, useVerifyRegistrationOtp } from '../hooks/useRegistration';
import { otpSchema, type OtpValues, type RegisterValues } from '../schemas';
import { FormAlert } from './FormAlert';
import { OtpExpiry } from './OtpExpiry';
import { OtpInput } from './OtpInput';
import type { RegisterFieldError } from './RegisterDetailsStep';
import { ResendCodeButton } from './ResendCodeButton';

const otpErrors = new Set<string>([
  authErrorCodes.otpInvalid,
  authErrorCodes.otpExpired,
  authErrorCodes.otpTooManyAttempts,
]);

/** The 409s of BR-AUTH-01 E1 can also happen here (someone registered meanwhile): back to step 1. */
function duplicateOf(error: unknown): RegisterFieldError | null {
  const code = errorCodeOf(error);
  if (code === authErrorCodes.emailExists)
    return { field: 'email', message: authErrorMessage(error) };
  if (code === authErrorCodes.phoneExists)
    return { field: 'phoneNumber', message: authErrorMessage(error) };
  return null;
}

/** SCR-W08 bước 2: the e-mailed code creates the account; the user then logs in (no auto-login, DA bước 10). */
export function RegisterOtpStep({
  details,
  sent,
  locked,
  onLocked,
  onResent,
  onBack,
}: {
  details: RegisterValues;
  sent: OtpSent;
  locked: boolean;
  onLocked: () => void;
  onResent: (sent: OtpSent) => void;
  onBack: (fieldError?: RegisterFieldError) => void;
}) {
  const navigate = useNavigate();
  const verify = useVerifyRegistrationOtp();
  const resend = useRequestRegistrationOtp();
  const [alert, setAlert] = useState<string | null>(null);
  const form = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ otp }) => {
    setAlert(null);
    try {
      await verify.mutateAsync({ email: details.email, otp });
      toast.success('Đăng ký thành công. Vui lòng đăng nhập.');
      navigate('/login', { state: { login: details.email } });
    } catch (error) {
      const code = errorCodeOf(error);
      const duplicate = duplicateOf(error);
      if (duplicate) return onBack(duplicate);
      if (code && otpErrors.has(code)) {
        form.resetField('otp');
        form.setError(
          'otp',
          { type: code, message: authErrorMessage(error) },
          { shouldFocus: true },
        );
        if (code === authErrorCodes.otpTooManyAttempts) onLocked();
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
      const next = await resend.mutateAsync(details);
      form.reset({ otp: '' });
      onResent(next);
      toast.success('Đã gửi lại mã xác thực.');
    } catch (error) {
      const duplicate = duplicateOf(error);
      if (duplicate) return onBack(duplicate);
      setAlert(authErrorMessage(error));
    }
  };

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Chúng tôi đã gửi mã gồm 6 chữ số tới{' '}
        <strong className="text-foreground">{sent.email}</strong>
      </p>
      <FormAlert message={alert} />
      <form noValidate className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <FormField label="Mã OTP" error={errors.otp?.message} required>
            {/* Not disabled while submitting: an otp_* error must be able to focus it again. */}
            <OtpInput {...form.register('otp')} />
          </FormField>
          <OtpExpiry expiresAtUtc={sent.expiresAtUtc} />
        </div>
        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting || verify.isPending}
          disabled={locked}
        >
          Xác nhận
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Button type="button" variant="link" className="h-auto px-0" onClick={() => onBack()}>
            Sửa thông tin
          </Button>
          <ResendCodeButton
            availableAtUtc={sent.resendAvailableAtUtc}
            onResend={() => void onResend()}
            loading={resend.isPending}
          />
        </div>
      </form>
    </>
  );
}
