import { useState, useEffect } from 'react';
import { Modal, StyleSheet, View, Pressable, ScrollView } from 'react-native';
import type { SaveSkinProfileRequest, SkinProfile, SkinType } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { AppInput } from '@components/common/AppInput';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { colors } from '@/theme/colors';
import { X } from 'lucide-react-native';
import { skinProfileSchema, toSkinProfileRequest } from '../schemas';
import { skinTypeOptions } from '../utils/careHelpers';

interface Props {
  visible: boolean;
  onClose: () => void;
  profileToEdit: SkinProfile | null;
  onSave: (data: SaveSkinProfileRequest) => Promise<void>;
}

export function SkinProfileModal({ visible, onClose, profileToEdit, onSave }: Props) {
  const [skinType, setSkinType] = useState<SkinType>('normal');
  const [mainConcerns, setMainConcerns] = useState('');
  const [currentProducts, setCurrentProducts] = useState('');
  const [careGoals, setCareGoals] = useState('');
  const [recommendedTreatment, setRecommendedTreatment] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileToEdit) {
      setSkinType(profileToEdit.skinType);
      setMainConcerns(profileToEdit.mainConcerns ?? '');
      setCurrentProducts(profileToEdit.currentProducts ?? '');
      setCareGoals(profileToEdit.careGoals ?? '');
      setRecommendedTreatment(profileToEdit.recommendedTreatment ?? '');
      setNote(profileToEdit.note ?? '');
    } else {
      setSkinType('normal');
      setMainConcerns('');
      setCurrentProducts('');
      setCareGoals('');
      setRecommendedTreatment('');
      setNote('');
    }
    setErrorMsg(null);
  }, [profileToEdit, visible]);

  const handleSave = async () => {
    setErrorMsg(null);
    const parsed = skinProfileSchema.safeParse({
      skinType,
      mainConcerns,
      currentProducts,
      careGoals,
      recommendedTreatment,
      note,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Vui lòng kiểm tra lại thông tin.');
      return;
    }

    try {
      setLoading(true);
      await onSave(toSkinProfileRequest(parsed.data));
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu hồ sơ da.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <AppText style={styles.title}>
              {profileToEdit ? 'Cập nhật hồ sơ da' : 'Lập hồ sơ da cho buổi này'}
            </AppText>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Đóng hộp thoại"
            >
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Medical Disclaimer (BR-CARE-01) */}
            <View style={styles.disclaimer}>
              <AppNotice
                tone="warning"
                title="Lưu ý quan trọng"
                message="Hồ sơ da ghi nhận tình trạng da để chăm sóc spa, không phải chẩn đoán y khoa."
              />
            </View>

            {/* Skin Type Selection */}
            <View style={styles.formGroup}>
              <AppText style={styles.label}>
                Loại da <AppText style={styles.required}>*</AppText>
              </AppText>
              <View style={styles.skinTypeGrid}>
                {skinTypeOptions.map((opt) => {
                  const isSelected = opt.value === skinType;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSkinType(opt.value)}
                      style={[styles.typeChip, isSelected && styles.activeTypeChip]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Loại da ${opt.label}`}
                    >
                      <AppText
                        style={[styles.typeChipText, isSelected && styles.activeTypeChipText]}
                      >
                        {opt.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Vấn đề chính của da</AppText>
              <AppInput
                label="Vấn đề chính của da"
                hideLabel
                value={mainConcerns}
                onChangeText={setMainConcerns}
                placeholder="Ví dụ: Mụn viêm vùng cằm, sạm nám gò má, thiếu ẩm..."
                multiline
                numberOfLines={3}
                maxLength={2000}
                style={styles.textarea}
                accessibilityLabel="Vấn đề chính của da"
              />
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Sản phẩm khách đang dùng ở nhà</AppText>
              <AppInput
                label="Sản phẩm đang dùng"
                hideLabel
                value={currentProducts}
                onChangeText={setCurrentProducts}
                placeholder="Tẩy trang, sữa rửa mặt, serum, kem chống nắng..."
                multiline
                numberOfLines={3}
                maxLength={2000}
                style={styles.textarea}
                accessibilityLabel="Sản phẩm đang dùng"
              />
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Mục tiêu chăm sóc</AppText>
              <AppInput
                label="Mục tiêu chăm sóc"
                hideLabel
                value={careGoals}
                onChangeText={setCareGoals}
                placeholder="Cấp ẩm phục hồi, làm dịu đỏ, cải thiện sắc tố..."
                multiline
                numberOfLines={3}
                maxLength={2000}
                style={styles.textarea}
                accessibilityLabel="Mục tiêu chăm sóc"
              />
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Liệu trình đề xuất tiếp theo</AppText>
              <AppInput
                label="Liệu trình đề xuất"
                hideLabel
                value={recommendedTreatment}
                onChangeText={setRecommendedTreatment}
                placeholder="Liệu trình chuyên sâu khuyên dùng..."
                multiline
                numberOfLines={3}
                maxLength={2000}
                style={styles.textarea}
                accessibilityLabel="Liệu trình đề xuất"
              />
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Ghi chú thêm</AppText>
              <AppInput
                label="Ghi chú thêm"
                hideLabel
                value={note}
                onChangeText={setNote}
                placeholder="Lưu ý kỹ thuật hoặc dặn dò khách hàng..."
                multiline
                numberOfLines={3}
                maxLength={2000}
                style={styles.textarea}
                accessibilityLabel="Ghi chú hồ sơ da"
              />
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <AppText style={styles.errorText}>{errorMsg}</AppText>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerBtn}>
              <AppButton
                title="Hủy"
                variant="outline"
                onPress={onClose}
                disabled={loading}
              />
            </View>
            <View style={styles.footerBtn}>
              <AppButton
                title={loading ? 'Đang lưu...' : 'Lưu hồ sơ da'}
                onPress={handleSave}
                disabled={loading}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 6,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 18,
  },
  disclaimer: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  skinTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 42,
    justifyContent: 'center',
  },
  activeTypeChip: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  activeTypeChipText: {
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorBox: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  footerBtn: {
    flex: 1,
  },
});
