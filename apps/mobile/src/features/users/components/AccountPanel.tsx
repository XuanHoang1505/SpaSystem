import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Camera, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiClientError, usersErrorCodes } from '@spa/api-client';
import type { Gender, MeDto } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppInput } from '@components/common/AppInput';
import { AppText } from '@components/common/AppText';
import { applyServerFieldErrors, authErrorMessage } from '@features/auth/errors';
import { toast } from '@/stores/toastStore';
import { colors, spacing, typography } from '@theme/index';
import { avatarUnreadableMessage, prepareAvatar, type AvatarFile } from '../avatarImage';
import { useDeleteAvatar, useUploadAvatar } from '../hooks/useAvatar';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { profileSchema, type ProfileFormValues } from '../schemas';
import { DateOfBirthField } from './DateOfBirthField';

const genders: readonly { value: Gender; label: string }[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

export function AccountPanel({ me }: { me: MeDto }) {
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  // The photo being uploaded, shown at once; cleared when the upload ends so a failure falls back to the old one.
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const avatarBusy = uploadAvatar.isPending || deleteAvatar.isPending;
  const shownAvatar = pendingUri ?? me.avatarUrl;

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: me.fullName, dateOfBirth: me.dateOfBirth, gender: me.gender },
  });
  const gender = profileForm.watch('gender');

  const saveProfile = profileForm.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({
        fullName: values.fullName.trim(),
        phoneNumber: me.phoneNumber,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender ?? null,
      });
      toast.success('Đã lưu thông tin.');
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        toast.error(authErrorMessage(error));
        return;
      }
      if (error.errors.some((item) => item.code === usersErrorCodes.phoneExists)) {
        toast.error('Số điện thoại đã được dùng cho tài khoản khác.');
        return;
      }
      if (error.errors.some((item) => item.code === usersErrorCodes.userNotFound)) {
        toast.error('Không tìm thấy tài khoản.');
        return;
      }
      if (
        !applyServerFieldErrors(error, profileForm.setError, ['fullName', 'dateOfBirth', 'gender'])
      ) {
        toast.error(authErrorMessage(error));
      }
    }
  });

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Ứng dụng cần quyền thư viện ảnh để đổi ảnh đại diện.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled || !result.assets[0]) return;

    let file: AvatarFile;
    try {
      file = await prepareAvatar(result.assets[0]);
    } catch {
      toast.error(avatarUnreadableMessage);
      return;
    }
    setPendingUri(file.uri);
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success('Đã cập nhật ảnh đại diện.');
    } catch (error) {
      const storageDown =
        error instanceof ApiClientError &&
        error.errors.some((item) => item.code === usersErrorCodes.imageStorageUnavailable);
      const serverMessage = error instanceof ApiClientError ? error.errors[0]?.message : undefined;
      toast.error(
        storageDown
          ? 'Kho ảnh tạm không dùng được. Vui lòng thử lại sau.'
          : (serverMessage ?? authErrorMessage(error)),
      );
    } finally {
      setPendingUri(null);
    }
  }

  async function removeImage() {
    try {
      await deleteAvatar.mutateAsync();
      toast.success('Đã xóa ảnh đại diện.');
    } catch (error) {
      toast.error(authErrorMessage(error));
    }
  }

  function openAvatarActions() {
    if (!me.avatarUrl) {
      void pickImage();
      return;
    }
    Alert.alert('Ảnh đại diện', undefined, [
      { text: 'Chọn ảnh từ thư viện', onPress: () => void pickImage() },
      { text: 'Xóa ảnh', style: 'destructive', onPress: () => void removeImage() },
      { text: 'Hủy', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.stack}>
      <View style={styles.identity}>
        <View style={styles.avatarWrap}>
          {shownAvatar ? (
            <Image
              testID="avatar"
              source={{ uri: shownAvatar }}
              accessible={false}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar}>
              <User size={42} color={colors.muted} strokeWidth={1.75} />
            </View>
          )}
          {avatarBusy ? (
            <View
              testID="avatar-busy"
              accessibilityLabel="Đang cập nhật ảnh đại diện"
              style={styles.avatarOverlay}
            >
              <ActivityIndicator color={colors.onPrimary} />
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi ảnh"
            accessibilityState={{ busy: avatarBusy, disabled: avatarBusy }}
            hitSlop={8}
            onPress={openAvatarActions}
            disabled={avatarBusy}
            style={[styles.camera, avatarBusy && styles.cameraBusy]}
          >
            <Camera size={16} color={colors.onPrimary} />
          </Pressable>
        </View>
        <AppText accessibilityRole="header" style={styles.name}>
          {me.fullName}
        </AppText>
      </View>

      <Controller
        control={profileForm.control}
        name="fullName"
        render={({ field, fieldState }) => (
          <AppInput
            ref={field.ref}
            label="Họ và tên"
            hideLabel
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            editable={!updateProfile.isPending}
          />
        )}
      />
      <AppInput label="Số điện thoại" hideLabel value={me.phoneNumber} editable={false} />
      <Controller
        control={profileForm.control}
        name="dateOfBirth"
        render={({ field, fieldState }) => (
          <DateOfBirthField
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            disabled={updateProfile.isPending}
          />
        )}
      />
      <AppInput label="Email" hideLabel value={me.email} editable={false} />

      <View style={styles.genders}>
        {genders.map((item) => {
          const selected = gender === item.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              disabled={updateProfile.isPending}
              onPress={() =>
                profileForm.setValue('gender', selected ? null : item.value, {
                  shouldDirty: true,
                })
              }
              style={styles.gender}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <AppText>{item.label}</AppText>
            </Pressable>
          );
        })}
      </View>
      {profileForm.formState.errors.gender?.message && (
        <AppText accessibilityRole="alert" style={styles.error}>
          {profileForm.formState.errors.gender.message}
        </AppText>
      )}

      <View style={styles.actions}>
        <AppButton title="Cập nhật" onPress={saveProfile} loading={updateProfile.isPending} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa lại mật khẩu"
          onPress={() => router.push('/password')}
        >
          <AppText style={styles.passwordLink}>Chỉnh sửa lại mật khẩu</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexGrow: 1, gap: spacing.md },
  actions: { marginTop: 'auto', gap: spacing.md, paddingTop: spacing.xl },
  identity: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatarWrap: { width: 104, height: 104 },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  camera: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  cameraBusy: { opacity: 0.5 },
  name: {
    fontSize: typography.heading,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  genders: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingVertical: spacing.sm },
  gender: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  error: { color: colors.error, fontSize: typography.small },
  passwordLink: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
