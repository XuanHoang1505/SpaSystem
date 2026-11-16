import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import { AppCard } from '@components/common/AppCard';
import { EmptyState } from '@components/common/EmptyState';
import { AppLoader } from '@components/common/AppLoader';
import { colors } from '@/theme/colors';
import type { ShiftAppointment } from '@spa/shared-types';
import { useMyWorkScheduleDetail } from '../../hooks/useMyWorkScheduleDetail';
import { formatFullVnDate } from '../../utils/scheduleHelpers';
import { Clock, Phone, Sparkles, ChevronRight, CalendarCheck, AlertCircle } from 'lucide-react-native';

interface Props {
  selectedShiftId: string;
  onPressAppointment: (appointmentId: string) => void;
}

export function ShiftAppointmentsPanel({
  selectedShiftId,
  onPressAppointment,
}: Props) {
  const { data: detail, isLoading, isError, refetch } = useMyWorkScheduleDetail(selectedShiftId);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <AppLoader />
        <AppText style={styles.loadingText}>Đang tải lịch hẹn trong ca...</AppText>
      </View>
    );
  }

  if (isError || !detail) {
    return (
      <View style={styles.errorWrap}>
        <AlertCircle size={24} color={colors.error} />
        <AppText style={styles.errorText}>Không thể tải thông tin ca làm việc.</AppText>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <AppText style={styles.retryBtnText}>Thử lại</AppText>
        </Pressable>
      </View>
    );
  }

  const { date, startTime, endTime, status, appointments } = detail;
  const isCancelled = status === 'cancelled';

  return (
    <View style={styles.container}>
      {/* Shift Title Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerInfo}>
          <AppText style={styles.bannerDate}>{formatFullVnDate(date)}</AppText>
          <View style={styles.bannerTimeRow}>
            <Clock size={14} color={colors.primaryPressed} />
            <AppText style={styles.bannerTime}>
              {startTime} – {endTime}
            </AppText>
            {isCancelled ? (
              <View style={styles.cancelledBadge}>
                <AppText style={styles.cancelledBadgeText}>Ca đã hủy</AppText>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.countBadge}>
          <AppText style={styles.countBadgeText}>{appointments.length} lịch hẹn</AppText>
        </View>
      </View>

      {/* Appointment list or empty */}
      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Chưa có lịch hẹn"
          description="Hiện tại ca làm này chưa có khách hàng đặt lịch hoặc được phân công."
        />
      ) : (
        <View style={styles.list}>
          {appointments.map((apt) => (
            <AppointmentItem
              key={apt.id}
              appointment={apt}
              onPress={() => onPressAppointment(apt.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function AppointmentItem({
  appointment,
  onPress,
}: {
  appointment: ShiftAppointment;
  onPress: () => void;
}) {
  const { id, startTime, endTime, status, customer, service, treatmentSession } = appointment;

  const handleCall = () => {
    if (customer.phoneNumber) {
      Linking.openURL(`tel:${customer.phoneNumber}`).catch(() => {});
    }
  };

  const statusLabel =
    status === 'completed'
      ? 'Đã xong'
      : status === 'confirmed'
        ? 'Đã xác nhận'
        : status === 'pending_confirmation'
          ? 'Chờ xác nhận'
          : status === 'no_show'
            ? 'Không đến'
            : status;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Lịch hẹn ${service.name} cho khách ${customer.fullName}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.timeTag}>
          <Clock size={13} color={colors.primaryPressed} />
          <AppText style={styles.timeTagText}>
            {startTime} – {endTime}
          </AppText>
        </View>

        <View
          style={[
            styles.statusTag,
            status === 'completed' && styles.statusTagCompleted,
            status === 'confirmed' && styles.statusTagConfirmed,
          ]}
        >
          <AppText
            style={[
              styles.statusTagText,
              status === 'completed' && styles.statusTagTextCompleted,
              status === 'confirmed' && styles.statusTagTextConfirmed,
            ]}
          >
            {statusLabel}
          </AppText>
        </View>
      </View>

      <AppText style={styles.serviceName}>{service.name}</AppText>

      {treatmentSession ? (
        <View style={styles.sessionBadge}>
          <Sparkles size={12} color={colors.primary} />
          <AppText style={styles.sessionBadgeText}>
            Buổi {treatmentSession.sequenceNumber}/{treatmentSession.totalSessions} · {treatmentSession.packageName}
          </AppText>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.customerGroup}>
          <AppText style={styles.customerName}>{customer.fullName}</AppText>
          {customer.phoneNumber ? (
            <Pressable
              onPress={handleCall}
              hitSlop={8}
              style={styles.phoneLink}
              accessibilityRole="button"
              accessibilityLabel={`Gọi điện cho ${customer.fullName}`}
            >
              <Phone size={12} color={colors.primary} />
              <AppText style={styles.phoneText}>{customer.phoneNumber}</AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.viewLink}>
          <AppText style={styles.viewLinkText}>Xem chi tiết</AppText>
          <ChevronRight size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  loadingWrap: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
  },
  errorWrap: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerInfo: {
    gap: 4,
  },
  bannerDate: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  bannerTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryPressed,
  },
  cancelledBadge: {
    backgroundColor: colors.errorSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cancelledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
  },
  countBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 14,
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.85,
    backgroundColor: colors.background,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTagCompleted: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
  },
  statusTagConfirmed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  statusTagTextCompleted: {
    color: colors.success,
  },
  statusTagTextConfirmed: {
    color: colors.primaryPressed,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryPressed,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  customerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  phoneText: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
