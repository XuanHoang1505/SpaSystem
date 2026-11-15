import { useState, useEffect } from 'react';
import { Modal, StyleSheet, View, Pressable, ScrollView } from 'react-native';
import type { AllergySeverity, CustomerAllergy } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { AppInput } from '@components/common/AppInput';
import { AppButton } from '@components/common/AppButton';
import { colors } from '@/theme/colors';
import { X } from 'lucide-react-native';
import { allergySchema } from '../schemas';
import { allergySeverityLabels } from '../utils/careHelpers';

interface Props {
  visible: boolean;
  onClose: () => void;
  allergyToEdit: CustomerAllergy | null;
  onSave: (data: { allergen: string; severity: AllergySeverity; note: string | null }) => Promise<void>;
}

const severityOptions: AllergySeverity[] = ['mild', 'moderate', 'severe'];

export function AllergyModal({ visible, onClose, allergyToEdit, onSave }: Props) {
  const [allergen, setAllergen] = useState('');
  const [severity, setSeverity] = useState<AllergySeverity>('mild');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (allergyToEdit) {
      setAllergen(allergyToEdit.allergen);
      setSeverity(allergyToEdit.severity);
      setNote(allergyToEdit.note ?? '');
    } else {
      setAllergen('');
      setSeverity('mild');
      setNote('');
    }
    setErrorMsg(null);
  }, [allergyToEdit, visible]);

  const handleSave = async () => {
    setErrorMsg(null);
    const parsed = allergySchema.safeParse({ allergen, severity, note });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        allergen: parsed.data.allergen,
        severity: parsed.data.severity,
        note: parsed.data.note.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu dị ứng.';
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
              {allergyToEdit ? 'Cập nhật dị ứng' : 'Thêm dị ứng cho khách'}
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
            <View style={styles.formGroup}>
              <AppText style={styles.label}>
                Tác nhân gây dị ứng <AppText style={styles.required}>*</AppText>
              </AppText>
              <AppInput
                label="Tác nhân gây dị ứng"
                hideLabel
                value={allergen}
                onChangeText={setAllergen}
                placeholder="Ví dụ: Cồn, Hương liệu, Paraben..."
                maxLength={255}
                accessibilityLabel="Tác nhân dị ứng"
              />
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>
                Mức độ nghiêm trọng <AppText style={styles.required}>*</AppText>
              </AppText>
              <View style={styles.severityRow}>
                {severityOptions.map((opt) => {
                  const isSelected = opt === severity;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setSeverity(opt)}
                      style={[styles.severityBtn, isSelected && styles.activeSeverityBtn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Mức độ ${allergySeverityLabels[opt]}`}
                    >
                      <AppText
                        style={[styles.severityBtnText, isSelected && styles.activeSeverityBtnText]}
                      >
                        {allergySeverityLabels[opt]}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Ghi chú (tùy chọn)</AppText>
              <AppInput
                label="Ghi chú dị ứng"
                hideLabel
                value={note}
                onChangeText={setNote}
                placeholder="Biểu hiện, lưu ý xử lý khi tiếp xúc..."
                multiline
                numberOfLines={3}
                maxLength={1000}
                style={styles.textarea}
                accessibilityLabel="Ghi chú dị ứng"
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
                title={loading ? 'Đang lưu...' : 'Lưu dị ứng'}
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
    maxHeight: '85%',
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  activeSeverityBtn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  severityBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  activeSeverityBtnText: {
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
