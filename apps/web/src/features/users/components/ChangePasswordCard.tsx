import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { ApiClientError, usersErrorCodes } from '@spa/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas';
import { useChangePassword } from '../hooks/useChangePassword';

export function ChangePasswordCard() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rateLimitAlert, setRateLimitAlert] = useState<string | null>(null);

  const changePasswordMutation = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setRateLimitAlert(null);
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      reset();
      toast.success('Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được thu hồi.');
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (
          error.status === 429 ||
          error.errors.some((e) => e.code === usersErrorCodes.rateLimited)
        ) {
          setRateLimitAlert('Bạn đã thao tác quá nhiều lần, vui lòng thử lại sau ít phút.');
          return;
        }

        let handled = false;
        for (const err of error.errors) {
          if (
            err.code === usersErrorCodes.invalidCurrentPassword ||
            err.code === 'password_mismatch' ||
            err.code === 'invalid_password'
          ) {
            setError('currentPassword', {
              message: 'Mật khẩu hiện tại không chính xác.',
            });
            handled = true;
          } else if (err.code === 'password_unchanged' || err.code === 'password_same_as_current') {
            setError('newPassword', {
              message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
            });
            handled = true;
          } else if (err.code === usersErrorCodes.passwordTooWeak) {
            setError('newPassword', {
              message: 'Mật khẩu chưa đủ độ mạnh.',
            });
            handled = true;
          } else if (err.field) {
            const field = err.field.charAt(0).toLowerCase() + err.field.slice(1);
            if (
              field === 'currentPassword' ||
              field === 'newPassword' ||
              field === 'confirmPassword'
            ) {
              setError(field as keyof ChangePasswordFormValues, { message: err.message });
              handled = true;
            }
          }
        }

        if (!handled) {
          toast.error(error.message || 'Không thể đổi mật khẩu, vui lòng thử lại.');
        }
      } else {
        toast.error('Đã xảy ra lỗi, vui lòng thử lại sau.');
      }
    }
  };

  const isBusy = isSubmitting || changePasswordMutation.isPending;

  return (
    <Card id="doi-mat-khau" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Đổi mật khẩu</CardTitle>
        <CardDescription>Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            Đổi mật khẩu sẽ đăng xuất tất cả các phiên đăng nhập khác của bạn trên mọi thiết bị.
          </p>
        </div>

        {rateLimitAlert && (
          <Alert variant="destructive">
            <AlertDescription>{rateLimitAlert}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              Mật khẩu hiện tại <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                {...register('currentPassword')}
                disabled={isBusy}
                aria-invalid={!!errors.currentPassword}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowCurrent((prev) => !prev)}
                tabIndex={-1}
                aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute top-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              Mật khẩu mới <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                {...register('newPassword')}
                disabled={isBusy}
                aria-invalid={!!errors.newPassword}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowNew((prev) => !prev)}
                tabIndex={-1}
                aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute top-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Mật khẩu từ 8–128 ký tự, bao gồm ít nhất một chữ cái và một chữ số.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Xác nhận mật khẩu mới <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                {...register('confirmPassword')}
                disabled={isBusy}
                aria-invalid={!!errors.confirmPassword}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowConfirm((prev) => !prev)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute top-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isBusy} className="gap-2">
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
