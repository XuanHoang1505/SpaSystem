import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Package, Sparkles, Target, UserRound } from 'lucide-react-native';
import type { MyTreatmentPlan } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { PurchaseStatusBadge } from '@/features/purchases/components/PurchaseStatusBadge';
import {
  formatUtcDateVn,
  getPackageStatusMeta,
  getRemainingDaysInfo,
  getTreatmentPlanStatusMeta,
} from '@/features/purchases/utils/purchaseHelpers';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';

export interface TreatmentOverviewCardProps {
  plan: MyTreatmentPlan;
  onPressViewPackage: (customerPackageId: string) => void;
}

export function TreatmentOverviewCard({ plan, onPressViewPackage }: TreatmentOverviewCardProps) {
  const statusMeta = getTreatmentPlanStatusMeta(plan.status);
  const pkgStatusMeta = getPackageStatusMeta(plan.packageStatus);
  const remainingDays = getRemainingDaysInfo(plan.expiresAtUtc);
  const remainingSessions = Math.max(0, plan.totalSessions - plan.usedSessions);
  const progressPercent =
    plan.totalSessions > 0
      ? Math.min(100, Math.round((plan.usedSessions / plan.totalSessions) * 100))
      : 0;

  return (
    <View style={styles.container}>
      {/* Plan Hero Cover Banner */}
      <View style={styles.heroBannerContainer}>
        {plan.imageUrl ? (
          <Image
            source={{ uri: plan.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
            accessibilityLabel={plan.packageName}
          />
        ) : (
          <View style={styles.heroFallback}>
            <Sparkles size={48} color={colors.primary} />
          </View>
        )}
        <View style={styles.heroBadgeOverlay}>
          <PurchaseStatusBadge meta={statusMeta} />
          {plan.packageStatus === 'expired' && <PurchaseStatusBadge meta={pkgStatusMeta} />}
        </View>
      </View>

      <View style={styles.card}>
        {/* Title & Link to Purchased Package */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <AppText style={styles.packageName}>{plan.packageName}</AppText>
            <View style={styles.orderAndLinkRow}>
              <AppText style={styles.orderCode}>Đơn {plan.order.code}</AppText>
              <Pressable
                onPress={() => onPressViewPackage(plan.customerPackageId)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Xem gói dịch vụ đã mua"
                style={styles.packageLinkRow}
              >
                <Package size={13} color={colors.primary} />
                <AppText style={styles.packageLinkText}>Xem gói đã mua →</AppText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Treatment Goal Highlight */}
        <View style={styles.goalBox}>
          <View style={styles.goalHeader}>
            <Target size={16} color={colors.primary} />
            <AppText style={styles.goalLabel}>Mục tiêu phác đồ chăm sóc da</AppText>
          </View>
          <AppText style={styles.goalText}>
            {plan.goal
              ? plan.goal
              : 'Chuyên viên sẽ cập nhật mục tiêu chăm sóc da sau buổi thăm khám đầu tiên.'}
          </AppText>
        </View>

        {/* 3-Metric Progress Box */}
        <View style={styles.metricsBox}>
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <AppText style={styles.metricLabel}>Tiến độ ({progressPercent}% hoàn thành)</AppText>
              <AppText style={styles.progressCountText}>
                {plan.usedSessions}/{plan.totalSessions} buổi
              </AppText>
            </View>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: plan.totalSessions,
                now: plan.usedSessions,
              }}
            >
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.threeColsRow}>
            <View style={styles.colItem}>
              <AppText style={styles.metricLabel}>Còn lại</AppText>
              <AppText style={styles.colValue}>{remainingSessions} buổi</AppText>
            </View>
            <View style={styles.colItem}>
              <AppText style={styles.metricLabel}>Đã đặt lịch</AppText>
              <AppText style={styles.colValue}>{plan.bookedSessions} buổi</AppText>
            </View>
            <View style={styles.colItem}>
              <AppText style={styles.metricLabel}>Hạn gói</AppText>
              <AppText style={[styles.colValue, remainingDays.isExpired && styles.colValueExpired]}>
                {remainingDays.remainingLabel}
              </AppText>
            </View>
          </View>
        </View>

        {/* Staff & Dates Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaRow}>
            <View style={styles.metaKeyWithIcon}>
              <UserRound size={14} color={colors.primary} />
              <AppText style={styles.metaKey}>Chuyên viên phụ trách:</AppText>
            </View>
            <AppText style={styles.metaVal}>
              {plan.primaryStaff ? plan.primaryStaff.fullName : 'Chưa phân công'}
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <AppText style={styles.metaKey}>Ngày bắt đầu:</AppText>
            <AppText style={styles.metaVal}>
              {plan.startDate ? formatLocalDate(plan.startDate) : 'Chưa bắt đầu'}
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <AppText style={styles.metaKey}>Dự kiến kết thúc:</AppText>
            <AppText style={styles.metaVal}>
              {plan.expectedEndDate ? formatLocalDate(plan.expectedEndDate) : 'Đang cập nhật'}
            </AppText>
          </View>
          {plan.actualEndDate && (
            <View style={styles.metaRow}>
              <AppText style={styles.metaKey}>Hoàn thành thực tế:</AppText>
              <AppText style={styles.metaVal}>{formatLocalDate(plan.actualEndDate)}</AppText>
            </View>
          )}
          <View style={styles.metaRow}>
            <AppText style={styles.metaKey}>Ngày mua / Hạn gói:</AppText>
            <AppText style={styles.metaVal}>
              {formatUtcDateVn(plan.purchasedAtUtc)} → {remainingDays.formattedDate}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  heroBannerContainer: {
    height: 160,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  heroBadgeOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 4,
  },
  orderAndLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  orderCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  packageName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  packageLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  packageLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  goalBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.secondary,
    padding: spacing.sm,
    gap: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  goalText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  metricsBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
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
    fontWeight: '600',
    color: colors.muted,
  },
  progressCountText: {
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  threeColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  colItem: {
    flex: 1,
    gap: 2,
  },
  colValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  colValueExpired: {
    color: colors.error,
  },
  metaGrid: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaKeyWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaKey: {
    fontSize: 13,
    color: colors.muted,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
