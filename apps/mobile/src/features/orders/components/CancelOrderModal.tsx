import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ApiClientError } from '@spa/api-client';
import { X } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';
import { useCancelOrder } from '../hooks/useCancelOrder';
import { cancelOrderSchema, quickOrderCancellationReasons } from '../schemas';

export interface CancelOrderModalProps {
  visible: boolean;
  order: {
    id: string;
    code: string;
    hasHeldAppointment?: boolean;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CancelOrderModal({ visible, order, onClose, onSuccess }: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const cancelMutation = useCancelOrder();

  useEffect(() => {
    if (visible) {
      setReason('');
      setFieldError(null);
    }
  }, [visible]);

  if (!order) return null;

  const handleConfirm = () => {
    const parsed = cancelOrderSchema.safeParse({ reason });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    setFieldError(null);
    cancelMutation.mutate(
      {
        orderId: order.id,
        reason: parsed.data.reason,
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
          Alert.alert('Đã hủy đơn hàng', `Đơn hàng ${order.code} đã được hủy thành công.`);
        },
        onError: (err) => {
          if (err instanceof ApiClientError) {
            const firstError = err.errors[0]?.code;
            if (firstError === 'order_not_cancellable') {
              onClose();
              onSuccess?.();
              Alert.alert(
                'Không thể hủy đơn',
                'Đơn hàng này không còn ở trạng thái chờ thanh toán để hủy.',
              );
              return;
            }
            if (firstError === 'order_payment_in_progress') {
              setFieldError(
                'Giao dịch thanh toán đang được xử lý. Vui lòng kiểm tra lại sau ít phút.',
              );
              return;
            }
          }
          setFieldError(err.message || 'Có lỗi xảy ra khi hủy đơn hàng. Vui lòng thử lại.');
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText style={styles.headerTitle}>Hủy đơn hàng</AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng hộp thoại hủy đơn"
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppNotice
              tone="warning"
              title={`Hủy đơn ${order.code}`}
              message={
                order.hasHeldAppointment
                  ? 'Hủy đơn hàng này sẽ đồng thời hủy lịch hẹn đang giữ chỗ của bạn. Thao tác này không thể hoàn tác.'
                  : 'Thao tác hủy đơn hàng không thể hoàn tác.'
              }
            />

            <View style={styles.fieldSection}>
              <AppText style={styles.fieldLabel}>Chọn lý do hủy nhanh</AppText>
              <View style={styles.chipsWrap}>
                {quickOrderCancellationReasons.map((item) => {
                  const isSelected = reason === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setReason(item);
                        setFieldError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                    >
                      <AppText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {item}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <AppText style={styles.fieldLabel}>Hoặc nhập lý do chi tiết</AppText>
                <AppText style={styles.charCount}>{reason.trim().length}/500</AppText>
              </View>
              <TextInput
                value={reason}
                onChangeText={(text) => {
                  setReason(text);
                  setFieldError(null);
                }}
                maxLength={500}
                multiline
                numberOfLines={3}
                placeholder="Nhập lý do hủy đơn hàng (tối đa 500 ký tự)..."
                placeholderTextColor={colors.muted}
                style={[styles.textArea, fieldError ? styles.textAreaError : null]}
                accessibilityLabel="Lý do hủy đơn hàng"
              />
              {fieldError ? <AppText style={styles.errorText}>{fieldError}</AppText> : null}
            </View>

            <View style={styles.actionsRow}>
              <View style={styles.actionBtn}>
                <AppButton
                  title="Quay lại"
                  variant="outline"
                  onPress={onClose}
                  disabled={cancelMutation.isPending}
                />
              </View>
              <View style={styles.actionBtn}>
                <AppButton
                  title="Xác nhận hủy"
                  variant="primary"
                  onPress={handleConfirm}
                  loading={cancelMutation.isPending}
                  disabled={reason.trim().length === 0}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: '85%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  fieldSection: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 12,
    color: colors.muted,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 88,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },
  textAreaError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});
