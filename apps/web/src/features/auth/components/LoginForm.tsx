import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField/FormField';
import { applyServerFieldErrors, authErrorMessage, UNKNOWN_ERROR } from '../errors';
import { useLogin } from '../hooks/useLogin';
import { loginSchema, type LoginValues } from '../schemas';
import { AuthCard } from './AuthCard';
import { ConfigurationAlert, useApiConfigured } from './ConfigurationAlert';
import { FormAlert } from './FormAlert';
import { PasswordInput } from './PasswordInput';

const alertCodes = new Set<string>([
  authErrorCodes.invalidCredentials,
  authErrorCodes.accountLocked,
  authErrorCodes.accountInactive,
  authErrorCodes.rateLimited,
]);

/** Register and password reset hand the email over in history state, never in the URL. */
const prefilledLogin = (state: unknown) =>
  typeof state === 'object' && state !== null && 'login' in state && typeof state.login === 'string'
    ? state.login
    : '';

/** SCR-W07. Once the session is set, GuestOnly moves the user to `?redirect` or their area. */
export function LoginForm() {
  const location = useLocation();
  const configured = useApiConfigured();
  const login = useLogin();
  const [alert, setAlert] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: prefilledLogin(location.state), password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setAlert(null);
    try {
      await login.mutateAsync(values);
    } catch (error) {
      const code = errorCodeOf(error);
      if (applyServerFieldErrors(error, form.setError, ['login', 'password'])) return;
      if (code === authErrorCodes.invalidCredentials) {
        form.resetField('password');
        form.setFocus('password');
      }
      if ((code && alertCodes.has(code)) || (error instanceof ApiClientError && error.status === 0))
        setAlert(authErrorMessage(error));
      else toast.error(UNKNOWN_ERROR);
    }
  });

  const busy = isSubmitting || login.isPending;
  return (
    <AuthCard
      eyebrow={
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Tài khoản</p>
      }
      title="Đăng nhập"
      description="Đăng nhập để đặt lịch, theo dõi liệu trình và quản lý tài khoản của bạn."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Đăng ký
          </Link>
        </>
      }
    >
      <ConfigurationAlert />
      <FormAlert message={alert} />
      <form noValidate className="grid gap-4" onSubmit={onSubmit}>
        <FormField label="Email hoặc số điện thoại" error={errors.login?.message} required>
          <Input
            autoComplete="username"
            placeholder="email@example.com hoặc 0901234567"
            disabled={busy}
            {...form.register('login')}
          />
        </FormField>
        <div className="grid gap-1.5">
          <FormField label="Mật khẩu" error={errors.password?.message} required>
            <PasswordInput
              autoComplete="current-password"
              placeholder="Nhập mật khẩu của bạn"
              disabled={busy}
              {...form.register('password')}
            />
          </FormField>
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" loading={busy} disabled={!configured}>
          Đăng nhập
        </Button>
      </form>
    </AuthCard>
  );
}
