import { Pressable, StyleSheet, View } from 'react-native';
import type { MyAppointmentListItem } from '@spa/shared-types';
import { Calendar, Clock, Sparkles, User } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { getBookingSourceLabel } from '../utils/bookingHelpers';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';
import { HoldCountdownBadge } from './HoldCountdownBadge';

export function AppointmentCard({
  item,
  onPressDetail,
  onPressReschedule,
  onPressCancel,
  onHoldExpired,
}: {
  item: MyAppointmentListItem;
  onPressDetail: () => void;
  onPressReschedule?: () => void;
  onPressCancel?: () => void;
  onHoldExpired?: () => void;
}) {
  const sourceLabel = getBookingSourceLabel(item.source, item.treatmentSession);
  const start = formatLocalTime(item.startTime);
  const end = formatLocalTime(item.endTime);

  return (
    <Pressable
      onPress={onPressDetail}
      accessibilityRole="button"
      accessibilityLabel={`Lịch hẹn ${item.service.name} ngày ${formatLocalDate(item.date)} lúc ${start}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Top Row: Date + Time + Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.dateTimeWrap}>
          <View style={styles.dateBadge}>
            <Calendar size={13} color={colors.primary} />
            <AppText style={styles.dateText}>{formatLocalDate(item.date)}</AppText>
          </View>
          <View style={styles.timeBadge}>
            <Clock size={13} color={colors.muted} />
            <AppText style={styles.timeText}>
              {start} – {end}
            </AppText>
          </View>
        </View>
        <AppointmentStatusBadge status={item.status} />
      </View>

      {/* Service & Staff Info */}
      <View style={styles.body}>
        <AppText style={styles.serviceName} numberOfLines={2}>
          {item.service.name}
        </AppText>

        <View style={styles.metaRow}>
          <Sparkles size={13} color={colors.primary} />
          <AppText style={styles.sourceText} numberOfLines={1}>
            {sourceLabel}
          </AppText>
        </View>

        <View style={styles.metaRow}>
          <User size={13} color={colors.muted} />
          <AppText style={styles.staffText}>KTV: {item.staff.fullName}</AppText>
        </View>

        {item.status === 'held' && item.holdExpiresAtUtc && (
          <View style={styles.countdownWrap}>
            <HoldCountdownBadge
              holdExpiresAtUtc={item.holdExpiresAtUtc}
              onExpired={onHoldExpired}
            />
          </View>
        )}
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onPressDetail}
          accessibilityRole="button"
          accessibilityLabel={`Xem chi tiết lịch hẹn ${item.service.name}`}
          style={styles.detailButton}
        >
          <AppText style={styles.detailButtonText}>Chi tiết</AppText>
        </Pressable>

        {item.canReschedule && onPressReschedule && (
          <Pressable
            onPress={onPressReschedule}
            accessibilityRole="button"
            accessibilityLabel={`Đổi giờ hẹn ${item.service.name}`}
            style={styles.rescheduleButton}
          >
            <AppText style={styles.rescheduleButtonText}>Đổi giờ hẹn</AppText>
          </Pressable>
        )}

        {item.canCancel && onPressCancel && (
          <Pressable
            onPress={onPressCancel}
            accessibilityRole="button"
            accessibilityLabel={`Hủy lịch hẹn ${item.service.name}`}
            style={styles.cancelButton}
          >
            <AppText style={styles.cancelButtonText}>Hủy lịch</AppText>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.94,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  dateTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    gap: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  staffText: {
    fontSize: 12,
    color: colors.muted,
  },
  countdownWrap: {
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  detailButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  rescheduleButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.small,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescheduleButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  cancelButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
});
