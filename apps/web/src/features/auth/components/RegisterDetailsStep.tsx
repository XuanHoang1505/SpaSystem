import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { OtpSent } from '@spa/shared-types';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField/FormField';
import { applyServerFieldErrors, authErrorMessage, UNKNOWN_ERROR } from '../errors';
import { useCountdown } from '@/hooks/useCountdown';
import { useRequestRegistrationOtp } from '../hooks/useRegistration';
import { registerSchema, type RegisterValues } from '../schemas';
import { useApiConfigured } from './ConfigurationAlert';
import { FormAlert } from './FormAlert';
import { PasswordInput } from './PasswordInput';

export type RegisterFieldError = { field: 'email' | 'phoneNumber'; message: string };

const fields = ['fullName', 'email', 'phoneNumber', 'password', 'confirmPassword'] as const;
const empty: RegisterValues = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
};

/** SCR-W08 bước 1: account details, then the code is e-mailed. */
export function RegisterDetailsStep({
  defaultValues,
  resendAvailableAtUtc,
  fieldError,
  onSent,
}: {
  defaultValues: RegisterValues | null;
  resendAvailableAtUtc: string | null;
  fieldError: RegisterFieldError | null;
  onSent: (details: RegisterValues, sent: OtpSent) => void;
}) {
  const configured = useApiConfigured();
  const requestOtp = useRequestRegistrationOtp();
  const waitSeconds = useCountdown(resendAvailableAtUtc);
  const [alert, setAlert] = useState<{ message: string; retry: boolean } | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: defaultValues ?? empty,
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (fieldError)
      form.setError(
        fieldError.field,
        {
          type: fieldError.field === 'email' ? authErrorCodes.emailExists : 'server',
          message: fieldError.message,
        },
        { shouldFocus: true },
      );
  }, [fieldError, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setAlert(null);
    try {
      onSent(values, await requestOtp.mutateAsync(values));
    } catch (error) {
      const code = errorCodeOf(error);
      if (code === authErrorCodes.emailExists)
        form.setError(
          'email',
          { type: code, message: authErrorMessage(error) },
          { shouldFocus: true },
        );
      else if (code === authErrorCodes.phoneExists)
        form.setError(
          'phoneNumber',
          { type: code, message: authErrorMessage(error) },
          { shouldFocus: true },
        );
      else if (applyServerFieldErrors(error, form.setError, fields)) return;
      else if (code === authErrorCodes.emailSendFailed)
        setAlert({ message: authErrorMessage(error), retry: true });
      else if (
        code === authErrorCodes.rateLimited ||
        (error instanceof ApiClientError && error.status === 0)
      )
        setAlert({ message: authErrorMessage(error), retry: false });
      else toast.error(UNKNOWN_ERROR);
    }
  });

  const busy = isSubmitting || requestOtp.isPending;
  return (
    <>
      <FormAlert
        message={alert?.message}
        action={
          alert?.retry && (
            <Button type="button" size="sm" variant="outline" onClick={() => void onSubmit()}>
              Thử lại
            </Button>
          )
        }
      />
      <form noValidate className="grid gap-4" onSubmit={onSubmit}>
        <FormField label="Họ và tên" error={errors.fullName?.message} required>
          <Input
            autoComplete="name"
            placeholder="Nguyễn Thị Lan"
            disabled={busy}
            {...form.register('fullName')}
          />
        </FormField>
        <div className="grid gap-1.5">
          <FormField label="Email" error={errors.email?.message} required>
            <Input
              type="email"
              autoComplete="email"
              placeholder="email@example.com"
              disabled={busy}
              {...form.register('email')}
            />
          </FormField>
          {errors.email?.type === authErrorCodes.emailExists && (
            <p className="text-xs">
              <Link to="/login" className="font-medium text-primary underline">
                Đăng nhập
              </Link>
              {' · '}
              <Link to="/forgot-password" className="font-medium text-primary underline">
                Quên mật khẩu?
              </Link>
            </p>
          )}
        </div>
        <FormField
          label="Số điện thoại"
          hint="10 chữ số, bắt đầu bằng 0"
          error={errors.phoneNumber?.message}
          required
        >
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0901234567"
            disabled={busy}
            {...form.register('phoneNumber')}
          />
        </FormField>
        <FormField
          label="Mật khẩu"
          hint="Từ 8 ký tự, gồm chữ cái và chữ số"
          error={errors.password?.message}
          required
        >
          <PasswordInput
            autoComplete="new-password"
            disabled={busy}
            {...form.register('password')}
          />
        </FormField>
        <FormField label="Xác nhận mật khẩu" error={errors.confirmPassword?.message} required>
          <PasswordInput
            autoComplete="new-password"
            disabled={busy}
            {...form.register('confirmPassword')}
          />
        </FormField>
        <Button
          type="submit"
          className="w-full"
          loading={busy}
          disabled={!configured || waitSeconds > 0}
        >
          Gửi mã xác thực
        </Button>
        {waitSeconds > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Gửi lại mã sau {waitSeconds} giây
          </p>
        )}
      </form>
    </>
  );
}
