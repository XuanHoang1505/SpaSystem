import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { MyAppointmentListItem } from '@spa/shared-types';
import { X } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppText } from '@components/common/AppText';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { useAvailability } from '../hooks/useAvailability';
import { useRescheduleAppointment } from '../hooks/useRescheduleAppointment';
import {
  anyStaffTimes,
  classifyBookingError,
  getTodayVnNow,
  resolveInitialBookingDate,
  type PickedSlot,
} from '../utils/bookingHelpers';
import { DateStripPicker } from './DateStripPicker';
import { StaffSlotPicker } from './StaffSlotPicker';

export function RescheduleAppointmentModal({
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
  const [today] = useState(() => getTodayVnNow());
  const [selectedDate, setSelectedDate] = useState<string>(today.date);
  const [picked, setPicked] = useState<PickedSlot | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (visible && appointment) {
      const initialDate = resolveInitialBookingDate(today.date, null, appointment.date);
      setSelectedDate(initialDate);
      setPicked(null);
      setErrorBanner(null);
    }
  }, [visible, appointment, today.date]);

  const availabilitySource = useMemo(
    () => (appointment ? { appointmentId: appointment.id } : null),
    [appointment],
  );

  const availabilityQuery = useAvailability(
    availabilitySource,
    selectedDate,
    visible && Boolean(appointment),
  );

  const rescheduleMutation = useRescheduleAppointment();

  if (!appointment) return null;

  const staffList = availabilityQuery.data?.staff ?? [];

  // Ensure picked slot is valid for currently loaded day
  const validSlot: PickedSlot | null =
    picked &&
    (!availabilityQuery.data ||
      (picked.staffMemberId === undefined
        ? anyStaffTimes(staffList).includes(picked.startTime)
        : staffList.some(
            (m) =>
              m.id === picked.staffMemberId &&
              m.slots.some((s) => s.startTime.slice(0, 5) === picked.startTime),
          )))
      ? picked
      : null;

  const isSameAsCurrent =
    Boolean(validSlot) &&
    selectedDate === appointment.date &&
    validSlot?.startTime === formatLocalTime(appointment.startTime) &&
    (validSlot?.staffMemberId ?? appointment.staff.id) === appointment.staff.id;

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setPicked(null);
    setErrorBanner(null);
  };

  const handleConfirm = () => {
    if (!validSlot) return;
    setErrorBanner(null);

    rescheduleMutation.mutate(
      {
        appointmentId: appointment.id,
        body: {
          date: selectedDate,
          startTime: validSlot.startTime,
          ...(validSlot.staffMemberId ? { staffMemberId: validSlot.staffMemberId } : {}),
        },
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
          Alert.alert('Thành công', 'Đã cập nhật lịch hẹn thành công.');
        },
        onError: (err) => {
          const classified = classifyBookingError(err);
          if (classified.shouldClearSlot || classified.shouldResetStaff) {
            setPicked(null);
          }
          if (classified.shouldRefetchAvailability) {
            void availabilityQuery.refetch();
          }
          if (classified.shouldCloseModal) {
            onClose();
            onSuccess?.();
            Alert.alert('Thông báo', classified.message);
            return;
          }
          setErrorBanner(classified.message);
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <AppText style={styles.headerTitle}>Đổi giờ hẹn</AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng hộp thoại đổi lịch"
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Appointment Summary */}
            <View style={styles.currentBox}>
              <AppText style={styles.currentLabel}>Lịch hẹn hiện tại:</AppText>
              <AppText style={styles.currentTitle}>{appointment.service.name}</AppText>
              <AppText style={styles.currentSub}>
                {formatLocalTime(appointment.startTime)} – {formatLocalTime(appointment.endTime)} ·{' '}
                {formatLocalDate(appointment.date)} · KTV {appointment.staff.fullName}
              </AppText>
            </View>

            {errorBanner && <AppNotice tone="error" message={errorBanner} />}

            <DateStripPicker
              todayVn={today.date}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />

            <View style={styles.slotCard}>
              <StaffSlotPicker
                staff={staffList}
                date={selectedDate}
                now={today}
                selected={validSlot}
                onSelect={(nextSlot) => {
                  setPicked(nextSlot);
                  setErrorBanner(null);
                }}
                currentStaffId={appointment.staff.id}
                isLoading={availabilityQuery.isLoading}
                isError={availabilityQuery.isError}
                errorMessage={availabilityQuery.error?.message}
                onRetry={() => void availabilityQuery.refetch()}
              />
            </View>

            {isSameAsCurrent && validSlot && (
              <AppNotice
                tone="info"
                message="Bạn đang chọn trùng ngày, khung giờ và kỹ thuật viên hiện tại. Vui lòng chọn khung giờ hoặc ngày mới."
              />
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerBtn}>
              <AppButton
                title="Quay lại"
                variant="outline"
                onPress={onClose}
                disabled={rescheduleMutation.isPending}
              />
            </View>
            <View style={styles.footerBtn}>
              <AppButton
                title={rescheduleMutation.isPending ? 'Đang lưu...' : 'Xác nhận đổi lịch'}
                onPress={handleConfirm}
                disabled={!validSlot || isSameAsCurrent || rescheduleMutation.isPending}
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
    maxHeight: '90%',
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
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  currentBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.md,
    gap: 2,
  },
  currentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  currentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  currentSub: {
    fontSize: 12,
    color: colors.muted,
  },
  slotCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
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
