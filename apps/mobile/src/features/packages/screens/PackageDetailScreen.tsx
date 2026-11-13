import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ShoppingBag,
  Sparkles,
} from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppTextButton } from '@components/common/AppTextButton';
import { formatCurrency, formatLocalDate } from '@/lib/formatting/formatters';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing, typography } from '@theme/index';
import { PackageRoadmapItem } from '../components/PackageRoadmapItem';
import { usePackage } from '../hooks/usePackage';
import { CartBadgeButton, useAddToCart } from '@/features/orders';

export function PackageDetailScreen() {
  const { packageId } = useLocalSearchParams<{ packageId: string }>();
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((state) => state.status);

  const { data: pkg, isLoading, isError, refetch } = usePackage(packageId ?? '');
  const addToCartMutation = useAddToCart();

  if (isLoading) {
    return (
      <AppScreen contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText style={styles.loadingText}>Đang tải thông tin gói dịch vụ...</AppText>
      </AppScreen>
    );
  }

  if (isError || !pkg) {
    return (
      <AppScreen contentContainerStyle={styles.centerNotice}>
        <AppNotice
          tone="error"
          title="Không tìm thấy gói dịch vụ"
          message="Gói dịch vụ bạn đang tìm không tồn tại hoặc đã hết thời gian mở bán."
        />
        <View style={styles.backButtonWrap}>
          <AppButton
            title="Quay lại danh sách gói"
            onPress={() => router.replace('/(public)/packages')}
          />
          <AppTextButton title="Thử lại" onPress={() => refetch()} />
        </View>
      </AppScreen>
    );
  }

  const isDiscontinued = pkg.status === 'discontinued';
  const hasSavings = pkg.retailPrice > pkg.price;
  const savingsAmount = hasSavings ? pkg.retailPrice - pkg.price : 0;
  const savingsPercent = hasSavings
    ? Math.round((savingsAmount / pkg.retailPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (authStatus !== 'authenticated') {
      router.push(
        `/(public)/login?redirect=${encodeURIComponent(`/(public)/packages/${pkg.id}`)}`,
      );
      return;
    }
    addToCartMutation.mutate(
      { servicePackageId: pkg.id },
      {
        onSuccess: () => {
          Alert.alert('Thành công', 'Đã thêm gói dịch vụ vào giỏ hàng.', [
            { text: 'Tiếp tục xem', style: 'cancel' },
            { text: 'Xem giỏ hàng', onPress: () => router.push('/cart') },
          ]);
        },
        onError: (err) => {
          Alert.alert('Thông báo', err.message || 'Không thể thêm vào giỏ hàng.');
        },
      },
    );
  };

  const handlePurchase = () => {
    if (authStatus === 'authenticated') {
      router.push(
        `/checkout?source=buy_now&servicePackageId=${pkg.id}`,
      );
    } else {
      router.push(
        `/(public)/login?redirect=${encodeURIComponent(`/checkout?source=buy_now&servicePackageId=${pkg.id}`)}`,
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Floating Header */}
      <View style={[styles.floatingHeader, { top: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={styles.floatingHeaderButton}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <CartBadgeButton />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 84 },
        ]}
      >
        <View style={styles.heroContainer}>
          {pkg.imageUrl ? (
            <Image
              source={{ uri: pkg.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={pkg.name}
            />
          ) : (
            <View style={styles.heroFallback}>
              <Sparkles size={56} color={colors.primary} />
            </View>
          )}
          {isDiscontinued && (
            <View style={styles.discontinuedBanner}>
              <AppText style={styles.discontinuedBannerText}>Tạm ngừng mở bán</AppText>
            </View>
          )}
        </View>

        <View style={styles.bodyContent}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Layers size={13} color={colors.primary} />
              <AppText style={styles.badgeText}>{pkg.totalSessions} buổi liệu trình</AppText>
            </View>
            <View style={styles.badge}>
              <Calendar size={13} color={colors.muted} />
              <AppText style={styles.badgeText}>Hạn dùng {pkg.validityDays} ngày</AppText>
            </View>
          </View>

          <AppText style={styles.title}>{pkg.name}</AppText>

          <View style={styles.pricingCard}>
            <View style={styles.priceRow}>
              <AppText style={styles.mainPrice}>{formatCurrency(pkg.price)}</AppText>
              {hasSavings && (
                <View style={styles.discountBadge}>
                  <AppText style={styles.discountText}>Tiết kiệm {savingsPercent}%</AppText>
                </View>
              )}
            </View>

            {hasSavings && (
              <AppText style={styles.savingsDetail}>
                Tổng giá mua lẻ từng buổi:{' '}
                <AppText style={styles.retailStrikethrough}>
                  {formatCurrency(pkg.retailPrice)}
                </AppText>
                {' '}(Tiết kiệm {formatCurrency(savingsAmount)})
              </AppText>
            )}

            {pkg.saleEndDate && (
              <View style={styles.salePeriodRow}>
                <Clock size={13} color={colors.warning} />
                <AppText style={styles.salePeriodText}>
                  Thời gian mở bán đến hết {formatLocalDate(pkg.saleEndDate)}
                </AppText>
              </View>
            )}
          </View>

          {pkg.description && (
            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Mô tả gói liệu trình</AppText>
              <AppText style={styles.descriptionText}>{pkg.description}</AppText>
            </View>
          )}

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>
              Lộ trình thực hiện ({pkg.items?.length ?? 0} giai đoạn / buổi)
            </AppText>
            <View style={styles.roadmapList}>
              {pkg.items && pkg.items.length > 0 ? (
                pkg.items.map((item) => (
                  <PackageRoadmapItem key={item.sortOrder} item={item} />
                ))
              ) : (
                <AppText style={styles.emptyRoadmap}>
                  Chưa có chi tiết danh sách buổi.
                </AppText>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Chính sách & Điều khoản gói</AppText>
            <View style={styles.policiesList}>
              <View style={styles.policyItem}>
                <CheckCircle2 size={16} color={colors.success} />
                <AppText style={styles.policyText}>
                  Thời hạn sử dụng được kích hoạt kể từ ngày thanh toán hoàn tất.
                </AppText>
              </View>
              <View style={styles.policyItem}>
                <CheckCircle2 size={16} color={colors.success} />
                <AppText style={styles.policyText}>
                  Gói dịch vụ không thể quy đổi thành tiền mặt hoặc chuyển nhượng.
                </AppText>
              </View>
              <View style={styles.policyItem}>
                <CheckCircle2 size={16} color={colors.success} />
                <AppText style={styles.policyText}>
                  Hỗ trợ bảo lưu liệu trình trong trường hợp đặc biệt tối đa 30 ngày.
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.stickyBottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        <View style={styles.bottomPriceColumn}>
          <AppText style={styles.bottomPriceLabel}>Trọn gói {pkg.totalSessions} buổi</AppText>
          <AppText style={styles.bottomPriceValue}>{formatCurrency(pkg.price)}</AppText>
        </View>
        <View style={styles.bottomCtaRow}>
          <Pressable
            onPress={handleAddToCart}
            disabled={isDiscontinued || addToCartMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Thêm gói dịch vụ vào giỏ hàng"
            style={[
              styles.addToCartIconBtn,
              (isDiscontinued || addToCartMutation.isPending) && styles.addToCartIconBtnDisabled,
            ]}
          >
            <ShoppingBag size={20} color={colors.primary} />
          </Pressable>
          <View style={styles.purchaseBtnWrap}>
            <AppButton
              title={isDiscontinued ? 'Tạm ngừng mở bán' : 'Mua gói'}
              onPress={handlePurchase}
              disabled={isDiscontinued}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.muted,
    fontSize: typography.body,
  },
  centerNotice: {
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  backButtonWrap: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    backgroundColor: colors.secondary,
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
  },
  discontinuedBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  discontinuedBannerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: typography.small,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  title: {
    fontSize: typography.heading,
    color: colors.text,
    fontWeight: 'bold',
  },
  pricingCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  discountBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.small,
  },
  discountText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  savingsDetail: {
    fontSize: typography.small,
    color: colors.muted,
  },
  retailStrikethrough: {
    textDecorationLine: 'line-through',
  },
  salePeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  salePeriodText: {
    fontSize: 11,
    color: colors.warning,
  },
  section: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: 'bold',
    color: colors.text,
  },
  descriptionText: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.text,
  },
  roadmapList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  emptyRoadmap: {
    color: colors.muted,
    fontStyle: 'italic',
    padding: spacing.sm,
  },
  policiesList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  policyItem: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  policyText: {
    fontSize: typography.small,
    color: colors.muted,
    flex: 1,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomPriceColumn: {
    gap: 2,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  floatingHeader: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  bottomCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addToCartIconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartIconBtnDisabled: {
    opacity: 0.4,
  },
  purchaseBtnWrap: {
    minWidth: 120,
  },
  bottomCtaColumn: {
    width: 170,
  },
});
