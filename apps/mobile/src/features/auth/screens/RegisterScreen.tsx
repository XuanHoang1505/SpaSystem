import { useEffect, useState, type ComponentProps } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm, type Control } from 'react-hook-form';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import type { OtpSent } from '@spa/shared-types';
import { Lock, Mail, Phone, User } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppInput } from '@components/common/AppInput';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppTextButton } from '@components/common/AppTextButton';
import { readEnvironment } from '@/config/env';
import { colors, spacing, typography } from '@theme/index';
import { OtpExpiry, OtpInput, ResendCodeButton } from '../components/OtpParts';
import { PasswordInput } from '../components/PasswordInput';
import { applyServerFieldErrors, authErrorMessage, UNKNOWN_ERROR } from '../errors';
import { useCountdown } from '../hooks/useCountdown';
import { useRequestRegistrationOtp, useVerifyRegistrationOtp } from '../hooks/useRegistration';
import { otpSchema, registerSchema, type OtpValues, type RegisterValues } from '../schemas';

type FieldError = { field: 'email' | 'phoneNumber'; message: string };

const empty: RegisterValues = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
};
const fields = ['fullName', 'email', 'phoneNumber', 'password', 'confirmPassword'] as const;

/** The 409s of BR-AUTH-01 E1, also possible at step 2 (someone registered meanwhile): back to step 1. */
function duplicateOf(error: unknown): FieldError | null {
  const code = errorCodeOf(error);
  if (code === authErrorCodes.emailExists)
    return { field: 'email', message: authErrorMessage(error) };
  if (code === authErrorCodes.phoneExists)
    return { field: 'phoneNumber', message: authErrorMessage(error) };
  return null;
}

/** The notice for errors that belong to no field: rate limit, mail failure, no connection. */
function noticeFor(error: unknown): string {
  const code = errorCodeOf(error);
  if (
    code === authErrorCodes.rateLimited ||
    code === authErrorCodes.emailSendFailed ||
    (error instanceof ApiClientError && error.status === 0)
  )
    return authErrorMessage(error);
  return UNKNOWN_ERROR;
}

/** SCR-M07 (UC-SPA-01): account details, then the e-mailed code; the user then signs in (no auto sign-in). */
export function RegisterScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [details, setDetails] = useState<RegisterValues | null>(null);
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [fieldError, setFieldError] = useState<FieldError | null>(null);

  return (
    <AppScreen contentContainerStyle={styles.screenContent}>
      <View style={styles.bannerContainer}>
        <Image
          source={require('@/assets/images/register_banner.png')}
          style={styles.banner}
          resizeMode="contain"
        />
      </View>

      <View style={styles.heading}>
        <AppText accessibilityRole="header" style={styles.title}>
          {step === 1 ? 'Đăng ký tài khoản' : 'Nhập mã xác thực'}
        </AppText>
      </View>
      {step === 2 && details && sent ? (
        <OtpStep
          details={details}
          sent={sent}
          onResent={setSent}
          onBack={(error) => {
            setFieldError(error ?? null);
            setStep(1);
          }}
        />
      ) : (
        <DetailsStep
          defaultValues={details}
          resendAvailableAtUtc={sent?.resendAvailableAtUtc ?? null}
          fieldError={fieldError}
          onSent={(values, next) => {
            setDetails(values);
            setSent(next);
            setFieldError(null);
            setStep(2);
          }}
        />
      )}
      <View style={styles.footer}>
        <AppText style={styles.muted}>Đã có tài khoản?</AppText>
        <AppTextButton title="Đăng nhập" onPress={() => router.replace('/(public)/login')} />
      </View>
    </AppScreen>
  );
}

function DetailsStep({
  defaultValues,
  resendAvailableAtUtc,
  fieldError,
  onSent,
}: {
  defaultValues: RegisterValues | null;
  resendAvailableAtUtc: string | null;
  fieldError: FieldError | null;
  onSent: (details: RegisterValues, sent: OtpSent) => void;
}) {
  const configError = readEnvironment().error;
  const requestOtp = useRequestRegistrationOtp();
  const waitSeconds = useCountdown(resendAvailableAtUtc);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: defaultValues ?? empty,
  });

  useEffect(() => {
    if (fieldError)
      form.setError(fieldError.field, { type: 'server', message: fieldError.message });
  }, [fieldError, form]);

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);
    requestOtp.mutate(values, {
      onSuccess: (next) => onSent(values, next),
      onError: (error) => {
        const duplicate = duplicateOf(error);
        if (duplicate)
          return form.setError(duplicate.field, { type: 'server', message: duplicate.message });
        if (applyServerFieldErrors(error, form.setError, fields)) return;
        setNotice(noticeFor(error));
      },
    });
  });

  const busy = requestOtp.isPending;
  return (
    <>
      {configError && <AppNotice tone="error" title="Configuration Error" message={configError} />}
      {notice && <AppNotice tone="error" message={notice} />}
      <View style={styles.form}>
        <TextField
          control={form.control}
          name="fullName"
          label="Họ và tên"
          hideLabel
          leading={<User size={18} color={colors.muted} />}
          busy={busy}
          placeholder="Nhập họ và tên"
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          control={form.control}
          name="email"
          label="Email"
          hideLabel
          leading={<Mail size={18} color={colors.muted} />}
          busy={busy}
          placeholder="Nhập email"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          control={form.control}
          name="phoneNumber"
          label="Số điện thoại"
          hideLabel
          leading={<Phone size={18} color={colors.muted} />}
          busy={busy}
          placeholder="Nhập số điện thoại"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Mật khẩu"
          hideLabel
          leading={<Lock size={18} color={colors.muted} />}
          busy={busy}
          placeholder="Nhập mật khẩu (từ 8 ký tự)"
        />
        <PasswordField
          control={form.control}
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          hideLabel
          leading={<Lock size={18} color={colors.muted} />}
          busy={busy}
          placeholder="Xác nhận lại mật khẩu"
        />
      </View>
      {waitSeconds > 0 && (
        <AppText style={styles.muted}>{`Gửi lại mã sau ${waitSeconds} giây`}</AppText>
      )}
      <AppButton
        title="Gửi mã xác thực"
        onPress={onSubmit}
        loading={busy}
        disabled={Boolean(configError) || waitSeconds > 0}
      />
    </>
  );
}

function OtpStep({
  details,
  sent,
  onResent,
  onBack,
}: {
  details: RegisterValues;
  sent: OtpSent;
  onResent: (sent: OtpSent) => void;
  onBack: (fieldError?: FieldError) => void;
}) {
  const verify = useVerifyRegistrationOtp();
  const resend = useRequestRegistrationOtp();
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const form = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });

  const onSubmit = form.handleSubmit(({ otp }) => {
    setNotice(null);
    verify.mutate(
      { email: details.email, otp },
      {
        onSuccess: () => {
          Alert.alert('Đăng ký thành công', 'Vui lòng đăng nhập.');
          router.replace({ pathname: '/(public)/login', params: { login: details.email } });
        },
        onError: (error) => {
          const duplicate = duplicateOf(error);
          if (duplicate) return onBack(duplicate);
          const code = errorCodeOf(error);
          if (
            code === authErrorCodes.otpInvalid ||
            code === authErrorCodes.otpExpired ||
            code === authErrorCodes.otpTooManyAttempts
          ) {
            form.setValue('otp', '');
            form.setError(
              'otp',
              { type: code, message: authErrorMessage(error) },
              { shouldFocus: true },
            );
            if (code === authErrorCodes.otpTooManyAttempts) setLocked(true);
            return;
          }
          if (applyServerFieldErrors(error, form.setError, ['otp'])) return;
          setNotice({ tone: 'error', message: noticeFor(error) });
        },
      },
    );
  });

  const onResend = () => {
    setNotice(null);
    resend.mutate(details, {
      onSuccess: (next) => {
        form.reset({ otp: '' });
        setLocked(false);
        onResent(next);
        setNotice({ tone: 'success', message: 'Đã gửi lại mã xác thực.' });
      },
      onError: (error) => {
        const duplicate = duplicateOf(error);
        if (duplicate) return onBack(duplicate);
        setNotice({ tone: 'error', message: authErrorMessage(error) });
      },
    });
  };

  return (
    <>
      <AppText>
        Chúng tôi đã gửi mã gồm 6 chữ số tới <AppText style={styles.strong}>{sent.email}</AppText>
      </AppText>
      {notice && <AppNotice tone={notice.tone} message={notice.message} />}
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
      <AppButton title="Xác nhận" onPress={onSubmit} loading={verify.isPending} disabled={locked} />
      <View style={styles.row}>
        <AppTextButton title="Sửa thông tin" onPress={() => onBack()} />
        <ResendCodeButton
          availableAtUtc={sent.resendAvailableAtUtc}
          onResend={onResend}
          loading={resend.isPending}
        />
      </View>
    </>
  );
}

type TextName = 'fullName' | 'email' | 'phoneNumber';
type PasswordName = 'password' | 'confirmPassword';
type InputProps = Omit<ComponentProps<typeof AppInput>, 'label' | 'value' | 'onChangeText'>;

function TextField({
  control,
  name,
  label,
  busy,
  leading,
  hideLabel,
  ...props
}: InputProps & {
  control: Control<RegisterValues>;
  name: TextName;
  label: string;
  busy: boolean;
  leading?: React.ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <AppInput
          ref={field.ref}
          label={label}
          hideLabel={hideLabel}
          leading={leading}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          autoCapitalize={name === 'fullName' ? 'words' : 'none'}
          autoCorrect={false}
          editable={!busy}
          {...props}
        />
      )}
    />
  );
}

function PasswordField({
  control,
  name,
  label,
  busy,
  placeholder,
  leading,
  hideLabel,
}: {
  control: Control<RegisterValues>;
  name: PasswordName;
  label: string;
  busy: boolean;
  placeholder?: string;
  leading?: React.ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <PasswordInput
          ref={field.ref}
          label={label}
          hideLabel={hideLabel}
          leading={leading}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          placeholder={placeholder}
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={128}
          editable={!busy}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    width: 170,
    height: 130,
  },
  heading: { alignItems: 'center', gap: spacing.xs },
  title: { fontSize: typography.heading, lineHeight: 32, color: colors.primary, textAlign: 'center' },
  form: { gap: spacing.sm },
  muted: { color: colors.muted },
  strong: { fontWeight: '600' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
