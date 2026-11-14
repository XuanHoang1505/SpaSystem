import { Image, StyleSheet, View } from 'react-native';
import { CalendarCheck, Clock, Sparkles } from 'lucide-react-native';
import type { PurchasedService } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppText } from '@components/common/AppText';
import { formatDuration, formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import {
  formatUtcDateVn,
  getEntitlementStatusMeta,
  getRemainingDaysInfo,
} from '../utils/purchaseHelpers';
import { PurchaseStatusBadge } from './PurchaseStatusBadge';

export interface PurchasedServiceCardProps {
  service: PurchasedService;
  onPressBook: (service: PurchasedService) => void;
  onPressAppointment: (appointmentId: string) => void;
}

export function PurchasedServiceCard({
  service,
  onPressBook,
  onPressAppointment,
}: PurchasedServiceCardProps) {
  const statusMeta = getEntitlementStatusMeta(service.status);
  const remainingInfo = getRemainingDaysInfo(service.expiresAtUtc);

  return (
    <View style={styles.card}>
      {/* Top Row: Status Badge + Order Code */}
      <View style={styles.topRow}>
        <PurchaseStatusBadge meta={statusMeta} />
        <AppText style={styles.orderCode}>Đơn {service.order.code}</AppText>
      </View>

      {/* Main Info: Thumbnail on Left + Information on Right */}
      <View style={styles.mainRow}>
        <View style={styles.thumbnailContainer}>
          {service.imageUrl ? (
            <Image
              source={{ uri: service.imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              accessibilityLabel={service.serviceName}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Sparkles size={28} color={colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.infoCol}>
          <AppText style={styles.serviceName}>{service.serviceName}</AppText>
          <View style={styles.metaLine}>
            <Clock size={13} color={colors.muted} />
            <AppText style={styles.metaText}>
              Thời lượng {formatDuration(service.durationMinutes)}
            </AppText>
          </View>
          <AppText style={styles.purchaseDateText}>
            Mua ngày {formatUtcDateVn(service.purchasedAtUtc)}
          </AppText>
        </View>
      </View>

      {/* Expiry Info */}
      <View style={styles.expiryRow}>
        <AppText style={styles.expiryLabel}>Hạn sử dụng:</AppText>
        <AppText style={[styles.expiryValue, remainingInfo.isExpired && styles.expiryValueExpired]}>
          {service.expiresAtUtc
            ? `${remainingInfo.formattedDate} (${remainingInfo.remainingLabel})`
            : 'Không giới hạn'}
        </AppText>
      </View>

      {/* Linked Appointment Info when Booked */}
      {service.appointment && (
        <View style={styles.appointmentBox}>
          <CalendarCheck size={16} color={colors.primary} />
          <View style={styles.appointmentTextCol}>
            <AppText style={styles.appointmentTitle}>
              Đã đặt: {formatLocalDate(service.appointment.date)} ·{' '}
              {formatLocalTime(service.appointment.startTime)} –{' '}
              {formatLocalTime(service.appointment.endTime)}
            </AppText>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {(service.canBook || service.appointment) && (
        <View style={styles.actionRow}>
          {service.canBook && (
            <AppButton
              title="Đặt lịch ngay"
              variant="primary"
              onPress={() => onPressBook(service)}
            />
          )}
          {!service.canBook && service.appointment && (
            <AppButton
              title="Xem lịch hẹn"
              variant="outline"
              onPress={() => onPressAppointment(service.appointment!.id)}
            />
          )}
        </View>
      )}
    </View>
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
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  orderCode: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumbnailContainer: {
    width: 84,
    height: 84,
    borderRadius: radius.small,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: colors.muted,
  },
  purchaseDateText: {
    fontSize: 12,
    color: colors.muted,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expiryLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  expiryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  expiryValueExpired: {
    color: colors.error,
  },
  appointmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  appointmentTextCol: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  actionRow: {
    marginTop: 2,
  },
});
