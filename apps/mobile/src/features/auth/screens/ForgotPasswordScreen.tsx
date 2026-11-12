import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import type { OtpSent, PasswordResetToken } from '@spa/shared-types';
import { Lock, Mail } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppInput } from '@components/common/AppInput';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppTextButton } from '@components/common/AppTextButton';
import { readEnvironment } from '@/config/env';
import { signOut } from '@/lib/api/session';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typography } from '@theme/index';
import { OtpExpiry, OtpInput, ResendCodeButton, StepProgress } from '../components/OtpParts';
import { PasswordInput } from '../components/PasswordInput';
import { applyServerFieldErrors, authErrorMessage, UNKNOWN_ERROR } from '../errors';
import {
  useRequestPasswordResetOtp,
  useResetPassword,
  useVerifyPasswordResetOtp,
} from '../hooks/usePasswordReset';
import {
  emailSchema,
  newPasswordSchema,
  otpSchema,
  type EmailValues,
  type NewPasswordValues,
  type OtpValues,
} from '../schemas';

const labels = { 1: 'Nhập email', 2: 'Nhập mã xác thực', 3: 'Mật khẩu mới' } as const;

const vietnamTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Rate limit and lost connection carry a useful message; anything else gets the fixed one. */
function noticeFor(error: unknown): string {
  return errorCodeOf(error) === authErrorCodes.rateLimited ||
    errorCodeOf(error) === authErrorCodes.emailSendFailed ||
    (error instanceof ApiClientError && error.status === 0)
    ? authErrorMessage(error)
    : UNKNOWN_ERROR;
}

/** SCR-M08 (UC-SPA-03): three steps on one screen; the reset token lives only in this state. */
export function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [reset, setReset] = useState<PasswordResetToken | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <AppScreen>
      <StepProgress step={step} total={3} label={labels[step]} />

      <View style={styles.bannerContainer}>
        <Image
          source={require('@/assets/images/forgot_password_banner.png')}
          style={styles.banner}
          resizeMode="contain"
        />
      </View>

      <View style={styles.heading}>
        <AppText accessibilityRole="header" style={styles.title}>
          Quên mật khẩu
        </AppText>
        {step === 1 && (
          <AppText style={styles.muted}>
            Nhập email của tài khoản để nhận mã đặt lại mật khẩu.
          </AppText>
        )}
      </View>
      {step === 3 && reset ? (
        <NewPasswordStep
          email={email}
          reset={reset}
          onInvalidToken={(message) => {
            setReset(null);
            setNotice(message);
            setStep(1);
          }}
        />
      ) : step === 2 && sent ? (
        <OtpStep
          email={email}
          sent={sent}
          onVerified={(token) => {
            setReset(token);
            setStep(3);
          }}
          onResent={setSent}
          onChangeEmail={() => setStep(1)}
        />
      ) : (
        <EmailStep
          key={notice ?? 'email'}
          defaultEmail={email}
          notice={notice}
          onSent={(value, next) => {
            setEmail(value);
            setSent(next);
            setNotice(null);
            setStep(2);
          }}
        />
      )}
      <View style={styles.footer}>
        <AppTextButton title="Về đăng nhập" onPress={() => router.replace('/(public)/login')} />
      </View>
    </AppScreen>
  );
}

function EmailStep({
  defaultEmail,
  notice,
  onSent,
}: {
  defaultEmail: string;
  notice: string | null;
  onSent: (email: string, sent: OtpSent) => void;
}) {
  const configError = readEnvironment().error;
  const requestOtp = useRequestPasswordResetOtp();
  const [error, setError] = useState<string | null>(notice);
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: defaultEmail },
  });

  const onSubmit = form.handleSubmit(({ email }) => {
    setError(null);
    requestOtp.mutate(
      { email },
      {
        onSuccess: (next) => onSent(email, next),
        onError: (failure) => {
          if (applyServerFieldErrors(failure, form.setError, ['email'])) return;
          setError(noticeFor(failure));
        },
      },
    );
  });

  return (
    <>
      {configError && <AppNotice tone="error" title="Configuration Error" message={configError} />}
      {error && <AppNotice tone="error" message={error} />}
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <AppInput
            ref={field.ref}
            label="Email"
            hideLabel
            leading={<Mail size={20} color={colors.muted} />}
            placeholder="Nhập email của bạn"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!requestOtp.isPending}
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <AppButton
        title="Gửi mã"
        onPress={onSubmit}
        loading={requestOtp.isPending}
        disabled={Boolean(configError)}
      />
    </>
  );
}

const accountBlocked = new Set<string>([
  authErrorCodes.accountLocked,
  authErrorCodes.accountInactive,
]);

function OtpStep({
  email,
  sent,
  onVerified,
  onResent,
  onChangeEmail,
}: {
  email: string;
  sent: OtpSent;
  onVerified: (token: PasswordResetToken) => void;
  onResent: (sent: OtpSent) => void;
  onChangeEmail: () => void;
}) {
  const verify = useVerifyPasswordResetOtp();
  const resend = useRequestPasswordResetOtp();
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const form = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });

  const onSubmit = form.handleSubmit(({ otp }) => {
    setNotice(null);
    verify.mutate(
      { email, otp },
      {
        onSuccess: onVerified,
        onError: (error) => {
          const code = errorCodeOf(error);
          if (code && accountBlocked.has(code)) {
            setBlocked(true);
            return setNotice({ tone: 'error', message: authErrorMessage(error) });
          }
          // Every OTP failure here is `otp_invalid` (E4), so the step never reveals an account.
          if (code === authErrorCodes.otpInvalid) {
            form.setValue('otp', '');
            return form.setError(
              'otp',
              { type: code, message: authErrorMessage(error) },
              { shouldFocus: true },
            );
          }
          if (applyServerFieldErrors(error, form.setError, ['otp'])) return;
          setNotice({ tone: 'error', message: noticeFor(error) });
        },
      },
    );
  });

  const onResend = () => {
    setNotice(null);
    resend.mutate(
      { email },
      {
        onSuccess: (next) => {
          form.reset({ otp: '' });
          onResent(next);
          setNotice({ tone: 'success', message: 'Nếu email có tài khoản, mã mới đã được gửi.' });
        },
        onError: (error) => setNotice({ tone: 'error', message: authErrorMessage(error) }),
      },
    );
  };

  return (
    <>
      <AppText style={styles.centerText}>
        Nếu <AppText style={styles.strong}>{email}</AppText> thuộc một tài khoản đang hoạt động,
        chúng tôi đã gửi mã gồm 6 chữ số tới email này.
      </AppText>
      {notice && <AppNotice tone={notice.tone} message={notice.message} />}
      {!blocked && (
        <>
          <Controller
            control={form.control}
            name="otp"
            render={({ field, fieldState }) => (
              <OtpInput
                ref={field.ref}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                onSubmitEditing={onSubmit}
              />
            )}
          />
          <OtpExpiry expiresAtUtc={sent.expiresAtUtc} />
          <AppButton title="Xác nhận mã" onPress={onSubmit} loading={verify.isPending} />
          <View style={styles.row}>
            <AppTextButton title="Đổi email" onPress={onChangeEmail} />
            <ResendCodeButton
              availableAtUtc={sent.resendAvailableAtUtc}
              onResend={onResend}
              loading={resend.isPending}
            />
          </View>
        </>
      )}
    </>
  );
}

function NewPasswordStep({
  email,
  reset,
  onInvalidToken,
}: {
  email: string;
  reset: PasswordResetToken;
  onInvalidToken: (message: string) => void;
}) {
  const resetPassword = useResetPassword();
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);
    resetPassword.mutate(
      { resetToken: reset.resetToken, ...values },
      {
        onSuccess: async () => {
          // BR-AUTH-11 revoked every refresh token, so a session open on this device is over too.
          if (useAuthStore.getState().status === 'authenticated') await signOut();
          Alert.alert('Đặt lại mật khẩu thành công', 'Vui lòng đăng nhập bằng mật khẩu mới.');
          router.replace({ pathname: '/(public)/login', params: { login: email } });
        },
        onError: (error) => {
          if (errorCodeOf(error) === authErrorCodes.invalidResetToken)
            return onInvalidToken(authErrorMessage(error));
          if (applyServerFieldErrors(error, form.setError, ['newPassword', 'confirmPassword']))
            return;
          setNotice(noticeFor(error));
        },
      },
    );
  });

  const busy = resetPassword.isPending;
  return (
    <>
      <AppText
        style={styles.muted}
      >{`Hoàn tất trước ${vietnamTime.format(new Date(reset.expiresAtUtc))}`}</AppText>
      {notice && <AppNotice tone="error" message={notice} />}
      <Controller
        control={form.control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <PasswordInput
            ref={field.ref}
            label="Mật khẩu mới"
            hideLabel
            leading={<Lock size={20} color={colors.muted} />}
            placeholder="Nhập mật khẩu mới (từ 8 ký tự)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            editable={!busy}
          />
        )}
      />
      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <PasswordInput
            ref={field.ref}
            label="Xác nhận mật khẩu"
            hideLabel
            leading={<Lock size={20} color={colors.muted} />}
            placeholder="Xác nhận lại mật khẩu mới"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            editable={!busy}
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <AppButton title="Đặt lại mật khẩu" onPress={onSubmit} loading={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  banner: {
    width: 220,
    height: 170,
  },
  heading: { alignItems: 'center', gap: spacing.xs },
  title: { fontSize: typography.heading, lineHeight: 34, color: colors.primary, textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  centerText: { textAlign: 'center' },
  strong: { fontWeight: '600' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: { alignItems: 'center' },
});
