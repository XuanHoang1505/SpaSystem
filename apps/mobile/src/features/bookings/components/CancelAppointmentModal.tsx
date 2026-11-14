import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { MyAppointmentListItem } from '@spa/shared-types';
import { X } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppText } from '@components/common/AppText';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { useCancelAppointment } from '../hooks/useCancelAppointment';
import { cancelAppointmentSchema, quickCancellationReasons } from '../schemas';
import { classifyBookingError } from '../utils/bookingHelpers';

export function CancelAppointmentModal({
  visible,
  appointment,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  appointment: MyAppointmentListItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const cancelMutation = useCancelAppointment();

  useEffect(() => {
    if (visible) {
      setReason('');
      setFieldError(null);
    }
  }, [visible]);

  if (!appointment) return null;

  const isPrepaidSource = appointment.source === 'entitlement' || appointment.source === 'session';

  const handleConfirm = () => {
    const parsed = cancelAppointmentSchema.safeParse({ reason });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Vui lòng nhập lý do hủy lịch hẹn.');
      return;
    }

    setFieldError(null);
    cancelMutation.mutate(
      {
        appointmentId: appointment.id,
        reason: parsed.data.reason,
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
          Alert.alert('Đã hủy lịch hẹn', 'Lịch hẹn của bạn đã được hủy thành công.');
        },
        onError: (err) => {
          const classified = classifyBookingError(err);
          if (classified.shouldCloseModal) {
            onClose();
            onSuccess?.();
            Alert.alert('Thông báo', classified.message);
            return;
          }
          setFieldError(classified.message);
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText style={styles.headerTitle}>Xác nhận hủy lịch hẹn</AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng hộp thoại hủy lịch"
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.summaryBox}>
              <AppText style={styles.summaryTitle}>{appointment.service.name}</AppText>
              <AppText style={styles.summarySub}>
                {formatLocalTime(appointment.startTime)} – {formatLocalTime(appointment.endTime)} ·{' '}
                {formatLocalDate(appointment.date)} · KTV {appointment.staff.fullName}
              </AppText>
            </View>

            <AppNotice
              tone="info"
              message={
                isPrepaidSource
                  ? 'Sau khi hủy, quyền sử dụng dịch vụ lẻ hoặc buổi liệu trình sẽ được hoàn lại để bạn đặt lịch vào thời gian khác.'
                  : 'Lịch hẹn sẽ chuyển sang trạng thái Đã hủy.'
              }
            />

            <View style={styles.fieldGroup}>
              <AppText style={styles.label}>Chọn nhanh hoặc nhập lý do hủy *</AppText>
              <View style={styles.chipsWrap}>
                {quickCancellationReasons.map((chip) => {
                  const isSelected = reason === chip;
                  return (
                    <Pressable
                      key={chip}
                      onPress={() => {
                        setReason(chip);
                        setFieldError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Lý do: ${chip}`}
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.reasonChip, isSelected && styles.reasonChipSelected]}
                    >
                      <AppText
                        style={[styles.reasonChipText, isSelected && styles.reasonChipTextSelected]}
                      >
                        {chip}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={reason}
                onChangeText={(val) => {
                  setReason(val);
                  if (fieldError) setFieldError(null);
                }}
                placeholder="Nhập lý do hủy lịch hẹn (tối đa 500 ký tự)..."
                placeholderTextColor={colors.muted}
                multiline
                maxLength={500}
                accessibilityLabel="Lý do hủy lịch hẹn"
                style={[styles.input, fieldError ? styles.inputError : null]}
              />
              <View style={styles.counterRow}>
                {fieldError ? <AppText style={styles.errorText}>{fieldError}</AppText> : <View />}
                <AppText style={styles.counterText}>{reason.length}/500</AppText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerBtn}>
              <AppButton
                title="Quay lại"
                variant="outline"
                onPress={onClose}
                disabled={cancelMutation.isPending}
              />
            </View>
            <View style={styles.footerBtn}>
              <AppButton
                title={cancelMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy lịch'}
                onPress={handleConfirm}
                disabled={cancelMutation.isPending}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryBox: {
    backgroundColor: colors.card,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  summarySub: {
    fontSize: 12,
    color: colors.muted,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 4,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  reasonChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  reasonChipTextSelected: {
    color: colors.onPrimary,
  },
  input: {
    minHeight: 88,
    backgroundColor: colors.card,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  counterText: {
    fontSize: 11,
    color: colors.muted,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  footerBtn: {
    flex: 1,
  },
});
