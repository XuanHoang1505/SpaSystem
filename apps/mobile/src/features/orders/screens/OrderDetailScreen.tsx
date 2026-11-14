import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OrderItem, OrderPayment } from '@spa/shared-types';
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  Clock,
  CreditCard,
  Receipt,
  ShoppingBag,
  Sparkles,
  Tag,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import {
  formatCurrency,
  formatLocalDate,
  formatLocalTime,
} from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import { CancelOrderModal } from '../components/CancelOrderModal';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { useCreatePayment } from '../hooks/useCreatePayment';
import { useOrder } from '../hooks/useOrder';
import {
  formatUtcDateTimeVn,
  getItemTypeLabel,
  getPaymentStatusMeta,
} from '../utils/orderHelpers';

export function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data: order, isLoading, isError, error, refetch } = useOrder(orderId ?? '');
  const createPaymentMutation = useCreatePayment();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/my-orders');
    }
  };

  const handleRepay = async () => {
    if (!order) return;
    try {
      setIsPaying(true);
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
      setIsPaying(false);
    }
  };

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại danh sách đơn"
          hitSlop={8}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText style={styles.headerTitle}>Chi tiết đơn hàng</AppText>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải chi tiết đơn hàng...</AppText>
        </View>
      ) : isError || !order ? (
        <View style={styles.errorWrap}>
          <AppNotice
            tone="error"
            title="Không tìm thấy đơn hàng"
            message={error instanceof Error ? error.message : 'Đơn hàng không tồn tại hoặc đã bị xóa.'}
          />
          <AppButton title="Về danh sách đơn hàng" onPress={() => router.replace('/my-orders')} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: spacing.xl + insets.bottom + 84 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {paymentError ? (
              <AppNotice
                tone="error"
                title="Lỗi thanh toán lại"
                message={paymentError}
              />
            ) : null}

            {/* 1. Status & Overview Card */}
            <View style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.codeCol}>
                  <AppText style={styles.orderCode}>{order.code}</AppText>
                  <AppText style={styles.dateText}>
                    Ngày tạo: {formatUtcDateTimeVn(order.createdAtUtc)}
                  </AppText>
                </View>
                <OrderStatusBadge status={order.status} size="md" />
              </View>

              {/* Pending Payment Warning */}
              {order.status === 'pending_payment' && order.isPayable && (
                <View style={styles.warningBox}>
                  <Clock size={16} color={colors.warning} />
                  <AppText style={styles.warningText}>
                    Vui lòng hoàn tất thanh toán trước {formatUtcDateTimeVn(order.paymentDueAtUtc)}{' '}
                    để xác nhận đơn hàng và kích hoạt quyền sử dụng.
                  </AppText>
                </View>
              )}

              {/* Cancelled Info */}
              {order.status === 'cancelled' && (
                <View style={styles.cancelledBox}>
                  <XCircle size={16} color={colors.error} />
                  <View style={styles.cancelledTextCol}>
                    <AppText style={styles.cancelledDateText}>
                      Đã hủy lúc: {formatUtcDateTimeVn(order.cancelledAtUtc)}
                    </AppText>
                    {order.cancellationReason ? (
                      <AppText style={styles.cancelledReasonText}>
                        Lý do: {order.cancellationReason}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              )}

              {/* Expired Info */}
              {order.status === 'expired' && (
                <View style={styles.expiredBox}>
                  <AlertCircle size={16} color={colors.muted} />
                  <AppText style={styles.expiredText}>
                    Đơn hàng đã quá thời hạn thanh toán 15 phút và đã tự động đóng.
                  </AppText>
                </View>
              )}

              {/* Held Appointment Box (if book-now order) */}
              {order.appointment && (
                <View style={styles.heldAppointmentBox}>
                  <View style={styles.heldHeaderRow}>
                    <CalendarCheck size={16} color={colors.primary} />
                    <AppText style={styles.heldHeaderTitle}>Lịch hẹn giữ chỗ</AppText>
                  </View>
                  {order.items[0] && (
                    <AppText style={styles.heldServiceName}>
                      {order.items[0].productName}
                    </AppText>
                  )}
                  <AppText style={styles.heldTimeText}>
                    {formatLocalDate(order.appointment.date)} ·{' '}
                    {formatLocalTime(order.appointment.startTime)} –{' '}
                    {formatLocalTime(order.appointment.endTime)}
                  </AppText>
                  <View style={styles.heldStaffRow}>
                    <UserRound size={13} color={colors.muted} />
                    <AppText style={styles.heldStaffText}>
                      Kỹ thuật viên:{' '}
                      {order.appointment.staff
                        ? order.appointment.staff.fullName
                        : 'Nhân viên bất kỳ'}
                    </AppText>
                  </View>
                  <AppText style={styles.heldNote}>
                    Lịch hẹn đang được giữ chỗ tạm thời cho đến khi hoàn tất thanh toán.
                  </AppText>
                </View>
              )}
            </View>

            {/* 2. Items Breakdown Card */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <ShoppingBag size={18} color={colors.primary} />
                <AppText style={styles.sectionTitle}>
                  Danh sách sản phẩm ({order.items.length})
                </AppText>
              </View>

              <View style={styles.itemsList}>
                {order.items.map((item: OrderItem) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemTopLine}>
                      <AppText style={styles.itemName}>{item.productName}</AppText>
                      <View style={styles.itemTypeBadge}>
                        <AppText style={styles.itemTypeBadgeText}>
                          {getItemTypeLabel(item.type)}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.itemPriceLine}>
                      <AppText style={styles.itemUnitPriceText}>
                        Số lượng: 1
                      </AppText>
                      <AppText style={styles.itemLineTotalText}>
                        {formatCurrency(item.unitPrice)}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 3. Totals Card */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Receipt size={18} color={colors.primary} />
                <AppText style={styles.sectionTitle}>Chi tiết thanh toán</AppText>
              </View>

              <View style={styles.totalsTable}>
                <View style={styles.totalsRow}>
                  <AppText style={styles.totalsKey}>Tạm tính:</AppText>
                  <AppText style={styles.totalsVal}>{formatCurrency(order.subtotal)}</AppText>
                </View>

                {order.discountTotal > 0 && (
                  <View style={styles.totalsRow}>
                    <View style={styles.promoKeyRow}>
                      <Tag size={13} color={colors.primary} />
                      <AppText style={styles.totalsKey}>
                        Ưu đãi {order.promotion?.code ? `(${order.promotion.code})` : ''}:
                      </AppText>
                    </View>
                    <AppText style={styles.totalsDiscountVal}>
                      -{formatCurrency(order.discountTotal)}
                    </AppText>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.totalsRow}>
                  <AppText style={styles.grandTotalKey}>Tổng thanh toán:</AppText>
                  <AppText style={styles.grandTotalVal}>
                    {formatCurrency(order.grandTotal)}
                  </AppText>
                </View>
              </View>
            </View>

            {/* 4. Payment Attempts History Card */}
            {order.payments && order.payments.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <CreditCard size={18} color={colors.primary} />
                  <AppText style={styles.sectionTitle}>
                    Lịch sử giao dịch ({order.payments.length})
                  </AppText>
                </View>

                <View style={styles.paymentsList}>
                  {order.payments.map((pmt: OrderPayment) => {
                    const meta = getPaymentStatusMeta(pmt.status);
                    return (
                      <View key={pmt.id} style={styles.paymentItem}>
                        <View style={styles.pmtHeaderRow}>
                          <AppText style={styles.pmtProvider}>Cổng VNPay</AppText>
                          <View
                            style={[
                              styles.pmtStatusPill,
                              {
                                backgroundColor: meta.backgroundColor,
                                borderColor: meta.borderColor,
                              },
                            ]}
                          >
                            <AppText
                              style={[styles.pmtStatusText, { color: meta.textColor }]}
                            >
                              {meta.label}
                            </AppText>
                          </View>
                        </View>
                        <View style={styles.pmtMetaRow}>
                          <AppText style={styles.pmtDate}>
                            {formatUtcDateTimeVn(pmt.createdAtUtc)}
                          </AppText>
                          <AppText style={styles.pmtAmount}>
                            {formatCurrency(pmt.amount)}
                          </AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Sticky Bottom Actions */}
          <View
            style={[
              styles.stickyBottomBar,
              { paddingBottom: Math.max(insets.bottom, spacing.sm) },
            ]}
          >
            {order.status === 'pending_payment' && order.isPayable ? (
              <View style={styles.stickyActionsRow}>
                {order.canCancel && (
                  <View style={styles.stickyBtnWrap}>
                    <AppButton
                      title="Hủy đơn hàng"
                      variant="outline"
                      onPress={() => setIsCancelModalOpen(true)}
                    />
                  </View>
                )}
                <View style={styles.stickyBtnWrap}>
                  <AppButton
                    title="Thanh toán lại"
                    variant="primary"
                    onPress={handleRepay}
                    loading={isPaying}
                  />
                </View>
              </View>
            ) : order.status === 'paid' ? (
              <View style={styles.stickyActionsRow}>
                <View style={styles.stickyBtnWrap}>
                  <AppButton
                    title="Xem gói của tôi"
                    variant="outline"
                    onPress={() => router.push('/(customer)/packages')}
                  />
                </View>
                <View style={styles.stickyBtnWrap}>
                  <AppButton
                    title="Đặt lịch ngay"
                    variant="primary"
                    onPress={() => router.push('/(customer)/bookings')}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.stickyBtnFull}>
                <AppButton
                  title="Tiếp tục khám phá dịch vụ"
                  variant="primary"
                  onPress={() => router.push('/(public)/services')}
                />
              </View>
            )}
          </View>

          {/* Cancel Order Modal */}
          <CancelOrderModal
            visible={isCancelModalOpen}
            order={{
              id: order.id,
              code: order.code,
              hasHeldAppointment: Boolean(order.appointment),
            }}
            onClose={() => setIsCancelModalOpen(false)}
            onSuccess={() => refetch()}
          />
        </>
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
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  codeCol: {
    flex: 1,
    gap: 3,
  },
  orderCode: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    lineHeight: 17,
    fontWeight: '600',
  },
  cancelledBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    padding: spacing.sm,
  },
  cancelledTextCol: {
    flex: 1,
    gap: 2,
  },
  cancelledDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  cancelledReasonText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  expiredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  expiredText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  heldAppointmentBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.secondary,
    padding: spacing.sm,
    gap: 4,
  },
  heldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heldHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  heldServiceName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  heldTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  heldStaffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heldStaffText: {
    fontSize: 12,
    color: colors.muted,
  },
  heldNote: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
    paddingTop: 2,
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
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  itemTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  itemTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  itemPriceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemUnitPriceText: {
    fontSize: 12,
    color: colors.muted,
  },
  itemDiscountText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  itemLineTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  totalsTable: {
    gap: spacing.xs,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalsKey: {
    fontSize: 13,
    color: colors.muted,
  },
  totalsVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  promoKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalsDiscountVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  grandTotalKey: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentsList: {
    gap: spacing.xs,
  },
  paymentItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  pmtHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pmtProvider: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  pmtStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  pmtStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pmtMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pmtDate: {
    fontSize: 12,
    color: colors.muted,
  },
  pmtAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
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
    ...shadows.card,
  },
  stickyActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stickyBtnWrap: {
    flex: 1,
  },
  stickyBtnFull: {
    width: '100%',
  },
});
