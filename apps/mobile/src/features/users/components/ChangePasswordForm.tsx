import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, View } from 'react-native';
import { ApiClientError, usersErrorCodes } from '@spa/api-client';
import { AppButton } from '@components/common/AppButton';
import { applyServerFieldErrors, authErrorMessage } from '@features/auth/errors';
import { toast } from '@/stores/toastStore';
import { spacing } from '@theme/index';
import { useChangePassword } from '../hooks/useChangePassword';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas';
import { PasswordField } from './PasswordField';

export function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const save = form.handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync(values);
      form.reset();
      toast.success('Đổi mật khẩu thành công. Các phiên khác đã được thu hồi.');
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        toast.error(authErrorMessage(error));
        return;
      }
      if (
        error.status === 429 ||
        error.errors.some((item) => item.code === usersErrorCodes.rateLimited)
      ) {
        toast.error('Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.');
        return;
      }
      if (error.errors.some((item) => item.code === usersErrorCodes.currentPasswordIncorrect)) {
        form.setError('currentPassword', { message: 'Mật khẩu hiện tại không đúng.' });
        return;
      }
      if (error.errors.some((item) => item.code === usersErrorCodes.passwordUnchanged)) {
        form.setError('newPassword', { message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
        return;
      }
      if (
        !applyServerFieldErrors(error, form.setError, [
          'currentPassword',
          'newPassword',
          'confirmPassword',
        ])
      ) {
        toast.error(authErrorMessage(error));
      }
    }
  });

  return (
    <View style={styles.stack}>
      <Controller
        control={form.control}
        name="currentPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            ref={field.ref}
            label="Mật khẩu hiện tại"
            hideLabel
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            editable={!changePassword.isPending}
          />
        )}
      />
      <Controller
        control={form.control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            ref={field.ref}
            label="Mật khẩu mới"
            hideLabel
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            editable={!changePassword.isPending}
          />
        )}
      />
      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <PasswordField
            ref={field.ref}
            label="Xác nhận mật khẩu mới"
            hideLabel
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            editable={!changePassword.isPending}
          />
        )}
      />
      <View style={styles.submit}>
        <AppButton title="Đổi mật khẩu" onPress={save} loading={changePassword.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexGrow: 1, gap: spacing.md },
  submit: { marginTop: 'auto', paddingTop: spacing.xl },
});
