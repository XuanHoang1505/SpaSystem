import { useEffect } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ShoppingBag } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@theme/index';
import { CartItemCard } from '../components/CartItemCard';
import { CartSkeleton } from '../components/CartSkeleton';
import { useCart } from '../hooks/useCart';
import { useRemoveCartItem } from '../hooks/useRemoveCartItem';

export function CartScreen() {
  const insets = useSafeAreaInsets();
  const { status } = useAuthStore();
  const {
    data: cart,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCart();
  const removeMutation = useRemoveCartItem();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/(public)/login?redirect=/cart');
    }
  }, [status]);

  const handleRemove = (id: string, name: string) => {
    Alert.alert(
      'Xóa khỏi giỏ hàng',
      `Bạn có chắc chắn muốn bỏ "${name}" khỏi giỏ hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            removeMutation.mutate(id);
          },
        },
      ],
    );
  };

  const hasItems = cart && cart.items.length > 0;
  const availableItemsCount =
    cart?.items.filter((item) => item.isAvailable).length ?? 0;

  return (
    <AppScreen scroll={false} style={styles.screenContainer}>
      {/* Standalone Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(customer)/home'))}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText style={styles.headerTitle}>Giỏ hàng</AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      {isLoading ? (
        <CartSkeleton />
      ) : isError ? (
        <View style={styles.errorContainer}>
          <AppNotice
            tone="error"
            title="Không thể tải giỏ hàng"
            message={
              error?.message ??
              'Đã có sự cố khi kết nối tới máy chủ. Vui lòng thử lại.'
            }
          />
          <View style={styles.retryButtonWrapper}>
            <AppButton title="Thử lại" onPress={() => refetch()} />
          </View>
        </View>
      ) : !hasItems ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={56} color={colors.primary} />
          </View>
          <AppText style={styles.emptyTitle}>
            Giỏ hàng của bạn đang trống
          </AppText>
          <AppText style={styles.emptySubtitle}>
            Hãy khám phá các dịch vụ chăm sóc và gói liệu trình ưu đãi đặc biệt
            của Như Nguyệt Spa nhé!
          </AppText>
          <View style={styles.emptyActions}>
            <AppButton
              title="Khám phá dịch vụ"
              variant="primary"
              onPress={() => router.push('/(public)/services')}
            />
            <AppButton
              title="Xem gói liệu trình"
              variant="outline"
              onPress={() => router.push('/(public)/packages')}
            />
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <FlatList
            data={cart.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CartItemCard
                item={item}
                onRemove={handleRemove}
                isRemoving={
                  removeMutation.isPending &&
                  removeMutation.variables === item.id
                }
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 110 + insets.bottom },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
          />

          {/* Sticky Bottom Bar */}
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            <View style={styles.totalInfo}>
              <AppText style={styles.totalLabel} numberOfLines={1}>
                Tạm tính ({availableItemsCount} món)
              </AppText>
              <AppText style={styles.totalAmount} numberOfLines={1}>
                {formatCurrency(cart.totalAmount)}
              </AppText>
            </View>
            <View style={styles.checkoutButtonWrapper}>
              <AppButton
                title="Tiến hành thanh toán"
                onPress={() => router.push('/checkout?source=cart')}
                disabled={
                  availableItemsCount === 0 || removeMutation.isPending
                }
                accessibilityLabel="Tiến hành thanh toán giỏ hàng"
              />
            </View>
          </View>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 0,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  retryButtonWrapper: {
    marginTop: spacing.md,
    width: 160,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f5ebe6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emptyActions: {
    width: '100%',
    gap: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  totalInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  checkoutButtonWrapper: {
    minWidth: 160,
  },
});
