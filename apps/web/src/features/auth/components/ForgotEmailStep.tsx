import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { OtpSent } from '@spa/shared-types';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField/FormField';
import { applyServerFieldErrors, authErrorMessage, UNKNOWN_ERROR } from '../errors';
import { useRequestPasswordResetOtp } from '../hooks/usePasswordReset';
import { emailSchema, type EmailValues } from '../schemas';
import { useApiConfigured } from './ConfigurationAlert';
import { FormAlert } from './FormAlert';

/** SCR-W09 bước 1. `notice` carries the reason when step 3 sent the user back (invalid_reset_token). */
export function ForgotEmailStep({
  defaultEmail,
  notice,
  onSent,
}: {
  defaultEmail: string;
  notice: string | null;
  onSent: (email: string, sent: OtpSent) => void;
}) {
  const configured = useApiConfigured();
  const request = useRequestPasswordResetOtp();
  const [alert, setAlert] = useState<{ message: string; retry: boolean } | null>(
    notice ? { message: notice, retry: false } : null,
  );
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: defaultEmail },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setAlert(null);
    try {
      onSent(email, await request.mutateAsync({ email }));
    } catch (error) {
      const code = errorCodeOf(error);
      if (applyServerFieldErrors(error, form.setError, ['email'])) return;
      if (code === authErrorCodes.emailSendFailed)
        setAlert({ message: authErrorMessage(error), retry: true });
      else if (
        code === authErrorCodes.rateLimited ||
        (error instanceof ApiClientError && error.status === 0)
      )
        setAlert({ message: authErrorMessage(error), retry: false });
      else toast.error(UNKNOWN_ERROR);
    }
  });

  const busy = isSubmitting || request.isPending;
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
        <FormField label="Email" error={errors.email?.message} required>
          <Input
            type="email"
            autoComplete="email"
            placeholder="email@example.com"
            disabled={busy}
            {...form.register('email')}
          />
        </FormField>
        <Button type="submit" className="w-full" loading={busy} disabled={!configured}>
          Gửi mã
        </Button>
      </form>
    </>
  );
}
