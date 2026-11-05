import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { PasswordResetToken } from '@spa/shared-types';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField/FormField';
import { formatTimeUtc } from '@/lib/formatting/formatters';
import { useAuthStore } from '@/stores/authStore';
import { applyServerFieldErrors, authErrorMessage, UNKNOWN_ERROR } from '../errors';
import { useResetPassword } from '../hooks/usePasswordReset';
import { newPasswordSchema, type NewPasswordValues } from '../schemas';
import { FormAlert } from './FormAlert';
import { PasswordInput } from './PasswordInput';

/** SCR-W09 bước 3. */
export function NewPasswordStep({
  email,
  reset,
  onInvalidToken,
}: {
  email: string;
  reset: PasswordResetToken;
  onInvalidToken: (message: string) => void;
}) {
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  const [alert, setAlert] = useState<string | null>(null);
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setAlert(null);
    try {
      await resetPassword.mutateAsync({ resetToken: reset.resetToken, ...values });
      // BR-AUTH-11 revoked every refresh token, so a session open in this tab is over too.
      if (useAuthStore.getState().status === 'authenticated')
        useAuthStore.getState().endSession('password_reset');
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
      navigate('/login', { state: { login: email } });
    } catch (error) {
      const code = errorCodeOf(error);
      if (code === authErrorCodes.invalidResetToken) return onInvalidToken(authErrorMessage(error));
      if (applyServerFieldErrors(error, form.setError, ['newPassword', 'confirmPassword'])) return;
      if (
        code === authErrorCodes.rateLimited ||
        (error instanceof ApiClientError && error.status === 0)
      )
        setAlert(authErrorMessage(error));
      else toast.error(UNKNOWN_ERROR);
    }
  });

  const busy = isSubmitting || resetPassword.isPending;
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Hoàn tất trước {formatTimeUtc(reset.expiresAtUtc)}
      </p>
      <FormAlert message={alert} />
      <form noValidate className="grid gap-4" onSubmit={onSubmit}>
        <FormField
          label="Mật khẩu mới"
          hint="Từ 8 ký tự, gồm chữ cái và chữ số"
          error={errors.newPassword?.message}
          required
        >
          <PasswordInput
            autoComplete="new-password"
            disabled={busy}
            {...form.register('newPassword')}
          />
        </FormField>
        <FormField label="Xác nhận mật khẩu" error={errors.confirmPassword?.message} required>
          <PasswordInput
            autoComplete="new-password"
            disabled={busy}
            {...form.register('confirmPassword')}
          />
        </FormField>
        <Button type="submit" className="w-full" loading={busy}>
          Đặt lại mật khẩu
        </Button>
      </form>
    </>
  );
}
