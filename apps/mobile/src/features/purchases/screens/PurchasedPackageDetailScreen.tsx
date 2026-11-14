import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CalendarCheck, Clock, Layers, Package, Sparkles } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import { PurchaseStatusBadge } from '../components/PurchaseStatusBadge';
import { usePurchasedPackage } from '../hooks/usePurchasedPackage';
import {
  classifyPurchaseError,
  formatUtcDateVn,
  getPackageCannotBookReason,
  getPackageStatusMeta,
  getRemainingDaysInfo,
  getTreatmentPlanStatusMeta,
} from '../utils/purchaseHelpers';

export function PurchasedPackageDetailScreen() {
  const insets = useSafeAreaInsets();
  const { packageId } = useLocalSearchParams<{ packageId?: string }>();

  const { data: pkg, isLoading, isError, error, refetch } = usePurchasedPackage(packageId);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/packages');
    }
  };

  if (isLoading) {
    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <AppText style={styles.headerTitle}>Chi tiết gói đã mua</AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải thông tin gói...</AppText>
        </View>
      </AppScreen>
    );
  }

  if (isError || !pkg) {
    const classified = classifyPurchaseError(error);
    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <AppText style={styles.headerTitle}>Chi tiết gói đã mua</AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorWrap}>
          <AppNotice
            tone="error"
            title={classified.kind === 'not_found' ? 'Không tìm thấy gói' : 'Lỗi tải chi tiết gói'}
            message={classified.message}
          />
          {classified.kind === 'not_found' ? (
            <AppButton
              title="Về Gói của tôi"
              onPress={() => router.replace('/(customer)/packages')}
            />
          ) : (
            <AppButton title="Thử lại" onPress={() => refetch()} />
          )}
        </View>
      </AppScreen>
    );
  }

  const pkgStatusMeta = getPackageStatusMeta(pkg.status);
  const planStatusMeta = getTreatmentPlanStatusMeta(pkg.treatmentPlan.status);
  const remainingDays = getRemainingDaysInfo(pkg.expiresAtUtc);
  const remainingSessions = Math.max(0, pkg.totalSessions - pkg.usedSessions);
  const progressPercent =
    pkg.totalSessions > 0
      ? Math.min(100, Math.round((pkg.usedSessions / pkg.totalSessions) * 100))
      : 0;
  const canBookNext = Boolean(pkg.nextSession?.canBook);

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Standalone Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText style={styles.headerTitle}>Chi tiết gói đã mua</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.xl + insets.bottom + 84 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Package Hero Cover Banner */}
        <View style={styles.heroBannerContainer}>
          {pkg.imageUrl ? (
            <Image
              source={{ uri: pkg.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={pkg.packageName}
            />
          ) : (
            <View style={styles.heroFallback}>
              <Package size={52} color={colors.primary} />
            </View>
          )}
          <View style={styles.heroBadgeOverlay}>
            <PurchaseStatusBadge meta={pkgStatusMeta} />
          </View>
        </View>

        {/* Overview Card */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <AppText style={styles.packageName}>{pkg.packageName}</AppText>
              <AppText style={styles.orderCodeText}>Đơn hàng: {pkg.order.code}</AppText>
            </View>
          </View>

          {/* 3-Metric Box */}
          <View style={styles.metricsBox}>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <AppText style={styles.metricLabel}>
                  Tiến trình thực hiện ({progressPercent}%)
                </AppText>
                <AppText style={styles.progressCountText}>
                  {pkg.usedSessions}/{pkg.totalSessions} buổi hoàn thành
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

            <View style={styles.divider} />

            <View style={styles.threeColsRow}>
              <View style={styles.colItem}>
                <AppText style={styles.metricLabel}>Còn lại</AppText>
                <AppText style={styles.colValue}>{remainingSessions} buổi</AppText>
              </View>
              <View style={styles.colItem}>
                <AppText style={styles.metricLabel}>Đang đặt lịch</AppText>
                <AppText style={styles.colValue}>{pkg.bookedSessions} buổi</AppText>
              </View>
              <View style={styles.colItem}>
                <AppText style={styles.metricLabel}>Thời hạn</AppText>
                <AppText
                  style={[styles.colValue, remainingDays.isExpired && styles.colValueExpired]}
                >
                  {remainingDays.remainingLabel}
                </AppText>
              </View>
            </View>
          </View>

          {/* Dates Meta */}
          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <AppText style={styles.metaKey}>Ngày mua gói:</AppText>
              <AppText style={styles.metaVal}>{formatUtcDateVn(pkg.purchasedAtUtc)}</AppText>
            </View>
            <View style={styles.metaRow}>
              <AppText style={styles.metaKey}>Ngày kích hoạt:</AppText>
              <AppText style={styles.metaVal}>
                {pkg.activatedAtUtc
                  ? formatUtcDateVn(pkg.activatedAtUtc)
                  : formatUtcDateVn(pkg.purchasedAtUtc)}
              </AppText>
            </View>
            <View style={styles.metaRow}>
              <AppText style={styles.metaKey}>Hạn sử dụng:</AppText>
              <AppText style={styles.metaVal}>
                {pkg.expiresAtUtc ? remainingDays.formattedDate : 'Không giới hạn'}
              </AppText>
            </View>
          </View>
        </View>

        {/* Breakdown of Services in Package */}
        {pkg.items && pkg.items.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Layers size={18} color={colors.primary} />
              <AppText style={styles.sectionTitle}>
                Số buổi theo từng dịch vụ ({pkg.items.length})
              </AppText>
            </View>

            <View style={styles.itemsList}>
              {pkg.items.map((item) => {
                const itemPercent =
                  item.totalSessions > 0
                    ? Math.min(100, Math.round((item.completedSessions / item.totalSessions) * 100))
                    : 0;
                return (
                  <View key={item.spaServiceId} style={styles.itemRow}>
                    <View style={styles.itemTopLine}>
                      <View style={styles.itemIconBadge}>
                        <Sparkles size={14} color={colors.primary} />
                      </View>
                      <AppText style={styles.itemServiceName}>{item.serviceName}</AppText>
                      <AppText style={styles.itemCountBadge}>
                        Đã dùng {item.completedSessions}/{item.totalSessions} buổi
                      </AppText>
                    </View>
                    <View style={styles.itemProgressTrack}>
                      <View style={[styles.itemProgressFill, { width: `${itemPercent}%` }]} />
                    </View>
                    {item.bookedSessions > 0 && (
                      <AppText style={styles.itemBookedNote}>
                        Đang có {item.bookedSessions} buổi đã đặt lịch hẹn
                      </AppText>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Next Session & Link to Treatment Plan Timeline */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Sparkles size={18} color={colors.primary} />
            <AppText style={[styles.sectionTitle, { flex: 1 }]}>
              Lộ trình & Buổi điều trị kế tiếp
            </AppText>
            <PurchaseStatusBadge meta={planStatusMeta} />
          </View>

          {pkg.nextSession ? (
            <View style={styles.nextSessionBox}>
              <CalendarCheck size={18} color={colors.primary} />
              <View style={styles.nextSessionInfo}>
                <AppText style={styles.nextSessionTitle}>
                  Buổi {pkg.nextSession.sequenceNumber}: {pkg.nextSession.serviceName}
                </AppText>
                <AppText style={styles.nextSessionMeta}>
                  Thời lượng {pkg.nextSession.durationMinutes} phút · Sớm nhất từ{' '}
                  {formatLocalDate(pkg.nextSession.earliestDate)}
                </AppText>
              </View>
            </View>
          ) : (
            <View style={styles.reasonBanner}>
              <Clock size={16} color={colors.muted} />
              <AppText style={styles.reasonText}>{getPackageCannotBookReason(pkg)}</AppText>
            </View>
          )}

          <AppButton
            title="Xem phác đồ & nhật ký liệu trình"
            variant="outline"
            onPress={() => router.push(`/treatment/${pkg.treatmentPlan.id}`)}
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      {canBookNext && pkg.nextSession && (
        <View
          style={[styles.stickyBottomBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
        >
          <View style={styles.stickyInfoCol}>
            <AppText style={styles.stickyLabel}>Buổi kế tiếp</AppText>
            <AppText style={styles.stickyValue} numberOfLines={1}>
              Buổi {pkg.nextSession.sequenceNumber}: {pkg.nextSession.serviceName}
            </AppText>
          </View>
          <View style={styles.stickyBtnWrap}>
            <AppButton
              title={`Đặt lịch buổi ${pkg.nextSession.sequenceNumber}`}
              variant="primary"
              onPress={() =>
                router.push(
                  `/booking/new?treatmentSessionId=${encodeURIComponent(
                    pkg.nextSession!.id,
                  )}&treatmentPlanId=${encodeURIComponent(pkg.treatmentPlan.id)}`,
                )
              }
            />
          </View>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  headerSpacer: {
    width: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  errorWrap: {
    padding: spacing.md,
    gap: spacing.md,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  packageName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  orderCodeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
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
  metaKey: {
    fontSize: 13,
    color: colors.muted,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
  },
  itemTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemServiceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  itemCountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  itemProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  itemProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  itemBookedNote: {
    fontSize: 12,
    color: colors.muted,
  },
  nextSessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    padding: spacing.sm,
  },
  nextSessionInfo: {
    flex: 1,
    gap: 2,
  },
  nextSessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  nextSessionMeta: {
    fontSize: 12,
    color: colors.text,
  },
  reasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.sm,
  },
  reasonText: {
    fontSize: 13,
    color: colors.muted,
  },
  stickyBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  stickyInfoCol: {
    flex: 1,
    gap: 2,
  },
  stickyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  stickyValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  stickyBtnWrap: {
    flex: 1.15,
  },
});
