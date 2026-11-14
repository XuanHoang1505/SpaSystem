import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MyOrderListItem, OrderStatus } from '@spa/shared-types';
import { ArrowLeft, LogIn, Receipt, ShoppingBag, UserPlus } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing } from '@theme/index';
import { CancelOrderModal } from '../components/CancelOrderModal';
import { MyOrderCard } from '../components/MyOrderCard';
import { useCreatePayment } from '../hooks/useCreatePayment';
import { useMyOrders } from '../hooks/useMyOrders';

type StatusChipKey = 'all' | OrderStatus;

const STATUS_CHIPS: { key: StatusChipKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending_payment', label: 'Chờ thanh toán' },
  { key: 'paid', label: 'Đã thanh toán' },
  { key: 'cancelled', label: 'Đã hủy' },
  { key: 'expired', label: 'Hết hạn' },
];

const EMPTY_ORDERS: MyOrderListItem[] = [];

export function MyOrdersScreen() {
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === 'authenticated';

  const [selectedStatus, setSelectedStatus] = useState<StatusChipKey>('all');
  const [orderToCancel, setOrderToCancel] = useState<MyOrderListItem | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const apiStatus = selectedStatus === 'all' ? undefined : selectedStatus;
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyOrders(
    { status: apiStatus },
    isAuthenticated,
  );

  const createPaymentMutation = useCreatePayment();

  const orders = useMemo(() => data?.items ?? EMPTY_ORDERS, [data]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/profile');
    }
  };

  const handleRepay = async (order: MyOrderListItem) => {
    try {
      setPayingOrderId(order.id);
      setPaymentError(null);

      const attempt = await createPaymentMutation.mutateAsync({
        orderId: order.id,
        client: 'mobile',
      });

      await WebBrowser.openAuthSessionAsync(
        attempt.paymentUrl,
        Linking.createURL('/payment/result'),
      );

      router.push(`/payment/result?orderId=${order.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không thể khởi tạo giao dịch thanh toán lại.';
      setPaymentError(message);
    } finally {
      setPayingOrderId(null);
    }
  };

  if (authStatus === 'restoring') {
    return (
      <AppScreen scroll={false} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  if (!isAuthenticated) {
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
          <AppText style={styles.headerTitle}>Đơn hàng của tôi</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.guestCard}>
          <View style={styles.guestIconCircle}>
            <Receipt size={32} color={colors.primary} />
          </View>
          <AppText style={styles.guestTitle}>Theo dõi đơn hàng & hóa đơn</AppText>
          <AppText style={styles.guestSubtitle}>
            Đăng nhập tài khoản thành viên để xem lịch sử mua dịch vụ, gói chăm sóc và trạng thái
            thanh toán.
          </AppText>

          <View style={styles.guestActionsRow}>
            <View style={styles.guestBtnWrap}>
              <AppButton
                title="Đăng nhập"
                variant="primary"
                onPress={() => router.push('/(public)/login')}
              />
            </View>
            <View style={styles.guestBtnWrap}>
              <AppButton
                title="Đăng ký"
                variant="outline"
                onPress={() => router.push('/(public)/register')}
              />
            </View>
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại trang tài khoản"
          hitSlop={8}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText style={styles.headerTitle}>Đơn hàng của tôi</AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Status Chips Filter */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {STATUS_CHIPS.map((chip) => {
            const isSelected = selectedStatus === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setSelectedStatus(chip.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Lọc ${chip.label}`}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <AppText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {chip.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {paymentError ? (
        <View style={styles.noticeWrap}>
          <AppNotice
            tone="error"
            title="Lỗi thanh toán lại"
            message={paymentError}
          />
        </View>
      ) : null}

      {/* Main Content List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải danh sách đơn hàng...</AppText>
        </View>
      ) : isError ? (
        <View style={styles.errorWrap}>
          <AppNotice
            tone="error"
            title="Không thể tải đơn hàng"
            message={error instanceof Error ? error.message : 'Vui lòng kiểm tra lại kết nối mạng.'}
          />
          <AppButton title="Thử lại" onPress={() => refetch()} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <MyOrderCard
              order={item}
              onPressDetail={(ord) => router.push(`/my-orders/${ord.id}`)}
              onPressCancel={(ord) => setOrderToCancel(ord)}
              onPressPay={handleRepay}
              isPaying={payingOrderId === item.id}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Receipt size={40} color={colors.muted} />
              <AppText style={styles.emptyTitle}>Bạn chưa có đơn hàng nào</AppText>
              <AppText style={styles.emptyDesc}>
                {selectedStatus === 'all'
                  ? 'Khi bạn mua dịch vụ hoặc gói chăm sóc tại Như Nguyệt Spa, đơn hàng sẽ hiển thị tại đây.'
                  : 'Không có đơn hàng nào phù hợp với bộ lọc trạng thái bạn đang chọn.'}
              </AppText>
              <View style={styles.emptyCtaWrap}>
                <AppButton
                  title="Khám phá dịch vụ ngay"
                  onPress={() => router.push('/(public)/services')}
                />
              </View>
            </View>
          }
        />
      )}

      {/* Cancel Order Modal */}
      <CancelOrderModal
        visible={Boolean(orderToCancel)}
        order={orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onSuccess={() => refetch()}
      />
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
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  chipsContainer: {
    backgroundColor: colors.card,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chipsRow: {
    paddingHorizontal: spacing.md,
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  noticeWrap: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCtaWrap: {
    marginTop: spacing.sm,
    width: '100%',
  },
  guestCard: {
    margin: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  guestActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  guestBtnWrap: {
    flex: 1,
  },
});
