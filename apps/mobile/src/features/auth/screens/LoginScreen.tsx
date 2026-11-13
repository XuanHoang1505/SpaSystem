import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Image, StyleSheet, View } from 'react-native';
import { authErrorCodes, errorCodeOf } from '@spa/api-client';
import { Lock, Mail } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppInput } from '@components/common/AppInput';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppTextButton } from '@components/common/AppTextButton';
import { readEnvironment } from '@/config/env';
import { safeRedirect } from '@/lib/auth/redirect';
import { homePathFor } from '@/stores/authStore';
import { colors, spacing, typography } from '@theme/index';
import { PasswordInput } from '../components/PasswordInput';
import { applyServerFieldErrors, authErrorMessage } from '../errors';
import { useLogin } from '../hooks/useLogin';
import { loginSchema, type LoginValues } from '../schemas';

/** SCR-M06 (UC-SPA-02): sign in with email or phone; `login` and `redirect` come from the route params. */
export function LoginScreen() {
  const params = useLocalSearchParams<{ login?: string; redirect?: string }>();
  const configError = readEnvironment().error;
  const login = useLogin();
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: params.login ?? '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);
    login.mutate(
      { login: values.login.trim(), password: values.password },
      {
        onSuccess: (result) =>
          router.replace(
            safeRedirect(params.redirect, result.user.role) ?? homePathFor(result.user.role),
          ),
        onError: (error) => {
          if (applyServerFieldErrors(error, form.setError, ['login', 'password'])) return;
          if (errorCodeOf(error) === authErrorCodes.invalidCredentials) {
            form.setValue('password', '');
            form.setFocus('password');
          }
          setNotice(authErrorMessage(error));
        },
      },
    );
  });

  return (
    <AppScreen>
      <View style={styles.bannerContainer}>
        <Image
          source={
            // Metro bundles an image only from a static require().
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('@/assets/images/login_banner.png')
          }
          style={styles.banner}
          resizeMode="contain"
        />
      </View>

      <View style={styles.heading}>
        <AppText accessibilityRole="header" style={styles.title}>
          Đăng nhập
        </AppText>
        <AppText style={styles.subtitle}>Chào mừng bạn trở lại Như Nguyệt Spa</AppText>
      </View>

      {configError && <AppNotice tone="error" title="Configuration Error" message={configError} />}
      {notice && <AppNotice tone="error" message={notice} />}

      <Controller
        control={form.control}
        name="login"
        render={({ field, fieldState }) => (
          <AppInput
            ref={field.ref}
            label="Email hoặc số điện thoại"
            hideLabel
            leading={<Mail size={20} color={colors.muted} />}
            placeholder="Nhập email hoặc số điện thoại"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
            maxLength={255}
            editable={!login.isPending}
          />
        )}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <PasswordInput
            ref={field.ref}
            label="Mật khẩu"
            hideLabel
            leading={<Lock size={20} color={colors.muted} />}
            placeholder="Nhập mật khẩu"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="current-password"
            textContentType="password"
            maxLength={128}
            editable={!login.isPending}
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <View style={styles.forgot}>
        <AppTextButton
          title="Quên mật khẩu?"
          onPress={() => router.push('/(public)/forgot-password')}
        />
      </View>

      <AppButton
        title="Đăng nhập"
        onPress={onSubmit}
        loading={login.isPending}
        disabled={Boolean(configError)}
      />

      <View style={styles.footer}>
        <AppText style={styles.subtitle}>Chưa có tài khoản?</AppText>
        <AppTextButton title="Đăng ký" onPress={() => router.push('/(public)/register')} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  banner: {
    width: 280,
    height: 220,
  },
  heading: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  title: {
    fontSize: typography.heading,
    lineHeight: 34,
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: { color: colors.muted, textAlign: 'center' },
  forgot: { alignItems: 'flex-end', marginTop: -spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
