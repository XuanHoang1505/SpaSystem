import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AppointmentDetail, SaveSkinProfileRequest, SkinProfile } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { EmptyState } from '@components/common/EmptyState';
import { colors } from '@/theme/colors';
import { Edit2, FileText } from 'lucide-react-native';
import { formatDateTimeUtc, skinTypeLabels } from '../utils/careHelpers';
import { SkinProfileModal } from './SkinProfileModal';
import { useCreateSkinProfile, useUpdateSkinProfile } from '../hooks/useCareMutations';

interface Props {
  appointment: AppointmentDetail;
  skinProfile: SkinProfile | null | undefined;
}

export function SkinProfileTab({ appointment, skinProfile }: Props) {
  const { id: appointmentId, status, skinProfileId } = appointment;
  const [modalVisible, setModalVisible] = useState(false);

  const createProfileMutation = useCreateSkinProfile();
  const updateProfileMutation = useUpdateSkinProfile();

  const canEditOrAdd = status === 'confirmed' || status === 'completed';

  const handleSaveProfile = async (body: SaveSkinProfileRequest) => {
    if (skinProfileId && skinProfile) {
      await updateProfileMutation.mutateAsync({
        appointmentId,
        skinProfileId,
        body,
      });
    } else {
      await createProfileMutation.mutateAsync({
        appointmentId,
        skinProfileId: null,
        body,
      });
    }
  };

  return (
    <View style={styles.container}>
      {!skinProfile ? (
        <View style={styles.emptyCard}>
          <EmptyState
            icon={FileText}
            title="Chưa có hồ sơ da"
            description="Buổi chăm sóc này chưa được lập hồ sơ đánh giá tình trạng da."
            action={
              canEditOrAdd ? (
                <AppButton
                  title="Lập hồ sơ da"
                  onPress={() => setModalVisible(true)}
                  accessibilityLabel="Lập hồ sơ da cho buổi chăm sóc"
                />
              ) : undefined
            }
          />
          {!canEditOrAdd ? (
            <AppText style={styles.cannotEditNote}>
              Lịch ở trạng thái hiện tại không thể lập hồ sơ da.
            </AppText>
          ) : null}
        </View>
      ) : (
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileHeaderInfo}>
              <AppText style={styles.sectionTitle}>Hồ sơ da khách hàng</AppText>
              <AppText style={styles.assessedBy}>
                Đánh giá bởi {skinProfile.assessedBy.fullName} lúc{' '}
                {formatDateTimeUtc(skinProfile.assessedAtUtc)}
              </AppText>
              {skinProfile.updatedAtUtc ? (
                <AppText style={styles.updatedAt}>
                  Cập nhật: {formatDateTimeUtc(skinProfile.updatedAtUtc)}
                </AppText>
              ) : null}
            </View>

            {canEditOrAdd ? (
              <Pressable
                onPress={() => setModalVisible(true)}
                style={styles.editBtn}
                accessibilityRole="button"
                accessibilityLabel="Cập nhật hồ sơ da"
              >
                <Edit2 size={15} color={colors.primary} />
                <AppText style={styles.editBtnText}>Sửa</AppText>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.fieldsList}>
            <View style={styles.fieldRow}>
              <AppText style={styles.fieldLabel}>Loại da:</AppText>
              <View style={styles.skinTypePill}>
                <AppText style={styles.skinTypePillText}>
                  {skinTypeLabels[skinProfile.skinType] ?? skinProfile.skinType}
                </AppText>
              </View>
            </View>

            {skinProfile.mainConcerns ? (
              <View style={styles.fieldCol}>
                <AppText style={styles.fieldLabel}>Vấn đề chính của da:</AppText>
                <AppText style={styles.fieldValue}>{skinProfile.mainConcerns}</AppText>
              </View>
            ) : null}

            {skinProfile.currentProducts ? (
              <View style={styles.fieldCol}>
                <AppText style={styles.fieldLabel}>Sản phẩm đang dùng ở nhà:</AppText>
                <AppText style={styles.fieldValue}>{skinProfile.currentProducts}</AppText>
              </View>
            ) : null}

            {skinProfile.careGoals ? (
              <View style={styles.fieldCol}>
                <AppText style={styles.fieldLabel}>Mục tiêu chăm sóc:</AppText>
                <AppText style={styles.fieldValue}>{skinProfile.careGoals}</AppText>
              </View>
            ) : null}

            {skinProfile.recommendedTreatment ? (
              <View style={styles.fieldCol}>
                <AppText style={styles.fieldLabel}>Liệu trình đề xuất:</AppText>
                <AppText style={styles.fieldValue}>{skinProfile.recommendedTreatment}</AppText>
              </View>
            ) : null}

            {skinProfile.note ? (
              <View style={styles.fieldCol}>
                <AppText style={styles.fieldLabel}>Ghi chú thêm:</AppText>
                <AppText style={styles.fieldValue}>{skinProfile.note}</AppText>
              </View>
            ) : null}
          </View>
        </View>
      )}

      <SkinProfileModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        profileToEdit={skinProfile ?? null}
        onSave={handleSaveProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyAction: {
    marginTop: 16,
    width: '100%',
    maxWidth: 240,
  },
  cannotEditNote: {
    marginTop: 12,
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  profileCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileHeaderInfo: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  assessedBy: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  updatedAt: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    minHeight: 36,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  fieldsList: {
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldCol: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  fieldValue: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  skinTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
  },
  skinTypePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
});
