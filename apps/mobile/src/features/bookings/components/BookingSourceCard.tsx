import { Image, StyleSheet, View } from 'react-native';
import { Clock, Package, Sparkles, UserCheck } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import {
  formatCurrency,
  formatDateTimeUtc,
  formatDuration,
  formatLocalDate,
} from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import type { BookingSourceData } from '../hooks/useBookingSource';

export function BookingSourceCard({ source }: { source: BookingSourceData }) {
  if (source.kind === 'service') {
    const { service } = source;
    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.thumbWrap}>
            {service.imageUrl ? (
              <Image
                source={{ uri: service.imageUrl }}
                style={styles.thumb}
                resizeMode="cover"
                accessibilityLabel={service.name}
              />
            ) : (
              <View style={styles.thumbFallback}>
                <Sparkles size={24} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.infoCol}>
            <View style={styles.badgePill}>
              <AppText style={styles.badgePillText}>ĐẶT TRỰC TIẾP</AppText>
            </View>
            <AppText style={styles.title} numberOfLines={2}>
              {service.name}
            </AppText>
            <View style={styles.metaRow}>
              <Clock size={13} color={colors.muted} />
              <AppText style={styles.metaText}>{formatDuration(service.durationMinutes)}</AppText>
            </View>
          </View>
        </View>
        <View style={styles.footerRow}>
          <AppText style={styles.priceLabel}>Giá dịch vụ</AppText>
          <AppText style={styles.priceValue}>{formatCurrency(service.price)}</AppText>
        </View>
      </View>
    );
  }

  if (source.kind === 'entitlement') {
    const { entitlement } = source;
    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.thumbWrap}>
            {entitlement.imageUrl ? (
              <Image
                source={{ uri: entitlement.imageUrl }}
                style={styles.thumb}
                resizeMode="cover"
                accessibilityLabel={entitlement.serviceName}
              />
            ) : (
              <View style={styles.thumbFallback}>
                <Sparkles size={24} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.infoCol}>
            <View style={[styles.badgePill, styles.badgePrepaid]}>
              <AppText style={[styles.badgePillText, styles.badgePrepaidText]}>
                DỊCH VỤ ĐÃ MUA
              </AppText>
            </View>
            <AppText style={styles.title} numberOfLines={2}>
              {entitlement.serviceName}
            </AppText>
            <View style={styles.metaRow}>
              <Clock size={13} color={colors.muted} />
              <AppText style={styles.metaText}>
                {formatDuration(entitlement.durationMinutes)} · Đơn {entitlement.order.code}
              </AppText>
            </View>
            {entitlement.expiresAtUtc && (
              <AppText style={styles.subText}>
                Hạn dùng: {formatDateTimeUtc(entitlement.expiresAtUtc)}
              </AppText>
            )}
          </View>
        </View>
        <View style={styles.footerRow}>
          <AppText style={styles.priceLabel}>Thanh toán hôm nay</AppText>
          <AppText style={styles.prepaidValue}>0 ₫ (Đã thanh toán)</AppText>
        </View>
      </View>
    );
  }

  const { plan, session } = source;
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.thumbWrap}>
          {plan.imageUrl ? (
            <Image
              source={{ uri: plan.imageUrl }}
              style={styles.thumb}
              resizeMode="cover"
              accessibilityLabel={plan.packageName}
            />
          ) : (
            <View style={styles.thumbFallback}>
              <Package size={24} color={colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.infoCol}>
          <View style={[styles.badgePill, styles.badgePrepaid]}>
            <AppText style={[styles.badgePillText, styles.badgePrepaidText]}>
              BUỔI LIỆU TRÌNH {session.sequenceNumber}/{plan.totalSessions}
            </AppText>
          </View>
          <AppText style={styles.title} numberOfLines={2}>
            {session.serviceName}
          </AppText>
          <AppText style={styles.packageText} numberOfLines={1}>
            Gói: {plan.packageName}
          </AppText>
          <View style={styles.metaRow}>
            <Clock size={13} color={colors.muted} />
            <AppText style={styles.metaText}>{formatDuration(session.durationMinutes)}</AppText>
          </View>
          {plan.primaryStaff && (
            <View style={styles.metaRow}>
              <UserCheck size={13} color={colors.primary} />
              <AppText style={styles.primaryStaffText}>
                KTV phụ trách: {plan.primaryStaff.fullName}
              </AppText>
            </View>
          )}
          {session.earliestDate && (
            <AppText style={styles.subText}>
              Đặt từ ngày: {formatLocalDate(session.earliestDate)}
            </AppText>
          )}
        </View>
      </View>
      <View style={styles.footerRow}>
        <AppText style={styles.priceLabel}>Thanh toán hôm nay</AppText>
        <AppText style={styles.prepaidValue}>0 ₫ (Trong gói đã mua)</AppText>
      </View>
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
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.small,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgePrepaid: {
    backgroundColor: colors.successSoft,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  badgePrepaidText: {
    color: colors.success,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  packageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
  },
  primaryStaffText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  subText: {
    fontSize: 11,
    color: colors.muted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  prepaidValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
});
