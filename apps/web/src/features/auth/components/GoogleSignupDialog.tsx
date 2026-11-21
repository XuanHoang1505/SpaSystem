import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { authErrorCodes, errorCodeOf } from '@spa/api-client';
import type { GoogleSignup } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField/FormField';
import { applyServerFieldErrors, authErrorMessage } from '../errors';
import { useCompleteGoogleSignup } from '../hooks/useGoogleSignIn';
import { googleSignupSchema, type GoogleSignupValues } from '../schemas';
import { FormAlert } from './FormAlert';

/**
 * First Google sign-in (Q-84): the account is created only after the customer gives a phone number, which Google does
 * not share. On success the session is set and GuestOnly moves the customer on, so this dialog just closes.
 */
export function GoogleSignupDialog({
  signup,
  onClose,
  onExpired,
}: {
  signup: GoogleSignup;
  onClose: () => void;
  /** The sign-up token expired or was refused: the customer has to press the Google button again. */
  onExpired: (message: string) => void;
}) {
  const complete = useCompleteGoogleSignup();
  const [alert, setAlert] = useState<string | null>(null);
  const form = useForm<GoogleSignupValues>({
    resolver: zodResolver(googleSignupSchema),
    defaultValues: { fullName: signup.fullName, phoneNumber: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setAlert(null);
    try {
      await complete.mutateAsync({ signupToken: signup.signupToken, ...values });
      toast.success('Đã tạo tài khoản. Chào mừng bạn đến với Spa Như Nguyệt!');
      onClose();
    } catch (error) {
      const code = errorCodeOf(error);
      if (applyServerFieldErrors(error, form.setError, ['fullName', 'phoneNumber'])) return;
      if (code === authErrorCodes.phoneExists) {
        form.setError(
          'phoneNumber',
          { type: 'server', message: authErrorMessage(error) },
          { shouldFocus: true },
        );
        return;
      }
      if (code === authErrorCodes.googleSignupTokenInvalid) {
        onExpired(authErrorMessage(error));
        return;
      }
      setAlert(authErrorMessage(error));
    }
  });

  const busy = isSubmitting || complete.isPending;
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hoàn tất đăng ký</DialogTitle>
          <DialogDescription>
            Bạn đăng nhập bằng Google lần đầu. Nhập số điện thoại để spa liên hệ khi có lịch hẹn.
          </DialogDescription>
        </DialogHeader>
        <FormAlert message={alert} />
        <form noValidate className="grid gap-4" onSubmit={onSubmit}>
          <FormField label="Email">
            <Input value={signup.email} readOnly disabled />
          </FormField>
          <FormField label="Họ và tên" error={errors.fullName?.message} required>
            <Input autoComplete="name" disabled={busy} {...form.register('fullName')} />
          </FormField>
          <FormField label="Số điện thoại" error={errors.phoneNumber?.message} required>
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="0901234567"
              disabled={busy}
              {...form.register('phoneNumber')}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={busy}>
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
