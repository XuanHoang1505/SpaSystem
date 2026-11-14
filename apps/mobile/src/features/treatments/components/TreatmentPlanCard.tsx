import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Clock, Sparkles, UserRound } from 'lucide-react-native';
import type { MyTreatmentListItem } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppText } from '@components/common/AppText';
import { PurchaseStatusBadge } from '@/features/purchases/components/PurchaseStatusBadge';
import {
  getPackageStatusMeta,
  getRemainingDaysInfo,
  getTreatmentPlanStatusMeta,
} from '@/features/purchases/utils/purchaseHelpers';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import { getTreatmentCannotBookReason } from '../utils/treatmentHelpers';

export interface TreatmentPlanCardProps {
  plan: MyTreatmentListItem;
  onPressDetail: (plan: MyTreatmentListItem) => void;
  onPressBookNext?: (plan: MyTreatmentListItem) => void;
}

export function TreatmentPlanCard({
  plan,
  onPressDetail,
  onPressBookNext,
}: TreatmentPlanCardProps) {
  const statusMeta = getTreatmentPlanStatusMeta(plan.status);
  const pkgStatusMeta = getPackageStatusMeta(plan.packageStatus);
  const remainingDays = getRemainingDaysInfo(plan.expiresAtUtc);
  const remainingSessions = Math.max(0, plan.totalSessions - plan.usedSessions);
  const progressPercent =
    plan.totalSessions > 0
      ? Math.min(100, Math.round((plan.usedSessions / plan.totalSessions) * 100))
      : 0;
  const canBookNext = Boolean(plan.nextSession?.canBook);

  return (
    <Pressable
      onPress={() => onPressDetail(plan)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Liệu trình ${plan.packageName}`}
    >
      {/* Top Row: Badges + Primary Staff */}
      <View style={styles.topRow}>
        <View style={styles.badgesGroup}>
          <PurchaseStatusBadge meta={statusMeta} />
          {plan.packageStatus === 'expired' && <PurchaseStatusBadge meta={pkgStatusMeta} />}
        </View>
        <View style={styles.staffChip}>
          <UserRound size={13} color={colors.primary} />
          <AppText style={styles.staffText} numberOfLines={1}>
            {plan.primaryStaff ? plan.primaryStaff.fullName : 'Chưa phân công KTV'}
          </AppText>
        </View>
      </View>

      {/* Title Row: Thumbnail on Left + Information on Right */}
      <View style={styles.titleRow}>
        <View style={styles.thumbnailContainer}>
          {plan.imageUrl ? (
            <Image
              source={{ uri: plan.imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              accessibilityLabel={plan.packageName}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Sparkles size={26} color={colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.titleCol}>
          <AppText style={styles.packageName}>{plan.packageName}</AppText>
          <AppText style={styles.expirySub}>
            {plan.expiresAtUtc
              ? `Hạn đến ${remainingDays.formattedDate} · ${remainingDays.remainingLabel}`
              : 'Thời hạn: Không giới hạn'}
          </AppText>
        </View>
      </View>

      {/* Progress Box */}
      <View style={styles.progressBox}>
        <View style={styles.progressHeader}>
          <AppText style={styles.progressLabel}>
            {plan.usedSessions}/{plan.totalSessions} buổi hoàn thành
          </AppText>
          <AppText style={styles.progressRight}>
            Còn {remainingSessions} buổi
            {plan.bookedSessions > 0 ? ` · Đã đặt ${plan.bookedSessions}` : ''}
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

      {/* Next Session Callout */}
      {plan.nextSession ? (
        <View style={styles.nextSessionBox}>
          <Sparkles size={15} color={colors.primary} />
          <View style={styles.nextSessionInfo}>
            <AppText style={styles.nextSessionTitle}>
              Buổi {plan.nextSession.sequenceNumber}: {plan.nextSession.serviceName}
            </AppText>
            {plan.nextSession.earliestDate && (
              <AppText style={styles.nextSessionSub}>
                Sớm nhất từ {formatLocalDate(plan.nextSession.earliestDate)}
              </AppText>
            )}
          </View>
        </View>
      ) : null}

      {!canBookNext && (
        <View style={styles.reasonRow}>
          <Clock size={14} color={colors.muted} />
          <AppText style={styles.reasonText}>{getTreatmentCannotBookReason(plan)}</AppText>
        </View>
      )}

      {/* Footer Actions */}
      <View style={styles.actionsRow}>
        <View style={styles.actionBtnWrap}>
          <AppButton title="Xem phác đồ" variant="outline" onPress={() => onPressDetail(plan)} />
        </View>
        {canBookNext && plan.nextSession && onPressBookNext && (
          <View style={styles.actionBtnWrapPrimary}>
            <AppButton
              title={`Đặt buổi ${plan.nextSession.sequenceNumber}`}
              variant="primary"
              onPress={() => onPressBookNext(plan)}
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
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '58%',
  },
  staffText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
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
  expirySub: {
    fontSize: 12,
    color: colors.muted,
  },
  progressBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  progressRight: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
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
  nextSessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  nextSessionInfo: {
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
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
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
