import { useState } from 'react';
import { Modal, StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { AppText } from '@components/common/AppText';
import { AppInput } from '@components/common/AppInput';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { colors } from '@/theme/colors';
import { X, CheckCircle } from 'lucide-react-native';
import { completeSchema } from '../schemas';

interface Props {
  visible: boolean;
  onClose: () => void;
  hasSkinProfile: boolean;
  onConfirm: (result: string | null) => Promise<void>;
}

export function CompleteAppointmentModal({ visible, onClose, hasSkinProfile, onConfirm }: Props) {
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setErrorMsg(null);
    const parsed = completeSchema.safeParse({ result });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? 'Kết quả không hợp lệ.');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(parsed.data.result.trim() || null);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể hoàn thành buổi chăm sóc.';
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
            <View style={styles.titleRow}>
              <CheckCircle size={20} color={colors.primary} />
              <AppText style={styles.title}>Hoàn thành buổi chăm sóc</AppText>
            </View>
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
            <View style={styles.notice}>
              <AppNotice
                tone="info"
                title="Lưu ý"
                message="Sau khi xác nhận, buổi chăm sóc này được tính là đã thực hiện xong và không thể hoàn tác."
              />
            </View>

            {!hasSkinProfile ? (
              <View style={styles.skinNotice}>
                <AppNotice
                  tone="warning"
                  title="Chưa có hồ sơ da"
                  message="Buổi này chưa có hồ sơ da. Bạn vẫn có thể xác nhận hoàn thành hoặc lập hồ sơ trước."
                />
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <AppText style={styles.label}>Kết quả chăm sóc (tùy chọn)</AppText>
              <AppInput
                label="Kết quả chăm sóc"
                hideLabel
                value={result}
                onChangeText={setResult}
                placeholder="Ghi nhận tình trạng da sau buổi, cảm nhận của khách hoặc lưu ý..."
                multiline
                numberOfLines={4}
                maxLength={2000}
                style={styles.textarea}
                accessibilityLabel="Kết quả chăm sóc"
              />
              <AppText style={styles.charCount}>{result.length}/2000</AppText>
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
                title="Quay lại"
                variant="outline"
                onPress={onClose}
                disabled={loading}
              />
            </View>
            <View style={styles.footerBtn}>
              <AppButton
                title={loading ? 'Đang xác nhận...' : 'Xác nhận hoàn thành'}
                onPress={handleConfirm}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  notice: {
    marginBottom: 12,
  },
  skinNotice: {
    marginBottom: 14,
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
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 4,
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
