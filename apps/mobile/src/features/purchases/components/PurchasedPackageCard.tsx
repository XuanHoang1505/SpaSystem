import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Clock, Package, Sparkles } from 'lucide-react-native';
import type { PurchasedPackage } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppText } from '@components/common/AppText';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import {
  formatUtcDateVn,
  getPackageCannotBookReason,
  getPackageStatusMeta,
  getRemainingDaysInfo,
} from '../utils/purchaseHelpers';
import { PurchaseStatusBadge } from './PurchaseStatusBadge';

export interface PurchasedPackageCardProps {
  pkg: PurchasedPackage;
  onPressDetail: (pkg: PurchasedPackage) => void;
  onPressBookNext?: (pkg: PurchasedPackage) => void;
  onPressTreatment?: (pkg: PurchasedPackage) => void;
}

export function PurchasedPackageCard({
  pkg,
  onPressDetail,
  onPressBookNext,
  onPressTreatment,
}: PurchasedPackageCardProps) {
  const statusMeta = getPackageStatusMeta(pkg.status);
  const remainingDays = getRemainingDaysInfo(pkg.expiresAtUtc);
  const remainingSessions = Math.max(0, pkg.totalSessions - pkg.usedSessions);
  const progressPercent =
    pkg.totalSessions > 0
      ? Math.min(100, Math.round((pkg.usedSessions / pkg.totalSessions) * 100))
      : 0;
  const canBookNext = Boolean(pkg.nextSession?.canBook);

  return (
    <Pressable
      onPress={() => onPressDetail(pkg)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Gói ${pkg.packageName}`}
    >
      {/* Top Row: Status Badge + Order Code */}
      <View style={styles.topRow}>
        <PurchaseStatusBadge meta={statusMeta} />
        <AppText style={styles.orderCode}>
          Đơn {pkg.order.code} · {formatUtcDateVn(pkg.purchasedAtUtc)}
        </AppText>
      </View>

      {/* Title Row: Thumbnail on Left + Information on Right */}
      <View style={styles.titleRow}>
        <View style={styles.thumbnailContainer}>
          {pkg.imageUrl ? (
            <Image
              source={{ uri: pkg.imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              accessibilityLabel={pkg.packageName}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Package size={26} color={colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.titleCol}>
          <AppText style={styles.packageName}>{pkg.packageName}</AppText>
          {onPressTreatment && (
            <Pressable
              onPress={() => onPressTreatment(pkg)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Xem nhật ký liệu trình ${pkg.packageName}`}
            >
              <AppText style={styles.treatmentLinkText}>Xem nhật ký liệu trình →</AppText>
            </Pressable>
          )}
        </View>
      </View>

      {/* 3-Metric Box */}
      <View style={styles.metricsBox}>
        {/* Metric 1: Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <AppText style={styles.metricLabel}>Tiến độ liệu trình</AppText>
            <AppText style={styles.progressValueText}>
              {pkg.usedSessions}/{pkg.totalSessions} buổi đã thực hiện
            </AppText>
          </View>
          <View
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: pkg.totalSessions,
              now: pkg.usedSessions,
            }}
          >
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <View style={styles.metricsDivider} />

        {/* Metric 2 & 3 Side-by-Side */}
        <View style={styles.metricsBottomRow}>
          <View style={styles.metricHalf}>
            <AppText style={styles.metricLabel}>Số buổi còn lại</AppText>
            <AppText style={styles.metricHighlight}>Còn {remainingSessions} buổi</AppText>
            {pkg.bookedSessions > 0 && (
              <AppText style={styles.metricSub}>Đã đặt lịch {pkg.bookedSessions} buổi</AppText>
            )}
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.metricHalf}>
            <AppText style={styles.metricLabel}>Thời hạn</AppText>
            <AppText style={styles.metricHighlight}>
              {pkg.expiresAtUtc ? `Hạn ${remainingDays.formattedDate}` : 'Không giới hạn'}
            </AppText>
            <AppText style={[styles.metricSub, remainingDays.isExpired && styles.metricSubExpired]}>
              {remainingDays.remainingLabel}
            </AppText>
          </View>
        </View>
      </View>

      {/* Next Session Callout */}
      {pkg.nextSession && (
        <View style={styles.nextSessionBox}>
          <Sparkles size={16} color={colors.primary} />
          <View style={styles.nextSessionTextCol}>
            <AppText style={styles.nextSessionTitle}>
              Buổi {pkg.nextSession.sequenceNumber} kế tiếp: {pkg.nextSession.serviceName}
            </AppText>
            <AppText style={styles.nextSessionSub}>
              Thời lượng {pkg.nextSession.durationMinutes} phút · Sớm nhất từ{' '}
              {formatLocalDate(pkg.nextSession.earliestDate)}
            </AppText>
          </View>
        </View>
      )}

      {/* Cannot book reason if not bookable */}
      {!canBookNext && (
        <View style={styles.reasonBanner}>
          <Clock size={14} color={colors.muted} />
          <AppText style={styles.reasonText}>{getPackageCannotBookReason(pkg)}</AppText>
        </View>
      )}

      {/* Footer Actions */}
      <View style={styles.actionsRow}>
        <View style={styles.actionBtnWrap}>
          <AppButton title="Chi tiết gói" variant="outline" onPress={() => onPressDetail(pkg)} />
        </View>
        {canBookNext && pkg.nextSession && onPressBookNext && (
          <View style={styles.actionBtnWrapPrimary}>
            <AppButton
              title={`Đặt buổi ${pkg.nextSession.sequenceNumber}`}
              variant="primary"
              onPress={() => onPressBookNext(pkg)}
            />
          </View>
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
    ...shadows.card,
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
  orderCode: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumbnailContainer: {
    width: 68,
    height: 68,
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
  titleCol: {
    flex: 1,
    gap: 4,
  },
  packageName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  treatmentLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  metricsBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  progressSection: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  progressValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  metricsDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  metricsBottomRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  metricHalf: {
    flex: 1,
    gap: 2,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  metricHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  metricSub: {
    fontSize: 12,
    color: colors.muted,
  },
  metricSubExpired: {
    color: colors.error,
    fontWeight: '600',
  },
  nextSessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  nextSessionTextCol: {
    flex: 1,
    gap: 2,
  },
  nextSessionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  nextSessionSub: {
    fontSize: 12,
    color: colors.text,
  },
  reasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  reasonText: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  actionBtnWrap: {
    flex: 1,
  },
  actionBtnWrapPrimary: {
    flex: 1.2,
  },
});
