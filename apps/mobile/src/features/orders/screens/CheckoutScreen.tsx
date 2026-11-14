import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OrderPreviewItem, OrderRequest, OrderSource } from '@spa/shared-types';
import { AlertTriangle, ArrowLeft, CalendarCheck, Clock, ShoppingBag } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { useBookNow } from '@/features/bookings/hooks/useBookNow';
import { classifyBookingError } from '@/features/bookings/utils/bookingHelpers';
import { formatCurrency, formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing } from '@theme/index';
import { CheckoutProductItem } from '../components/CheckoutProductItem';
import { OrderTotalsCard } from '../components/OrderTotalsCard';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { PromotionInputCard } from '../components/PromotionInputCard';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { useCreatePayment } from '../hooks/useCreatePayment';
import { useOrder } from '../hooks/useOrder';
import { useOrderPreview } from '../hooks/useOrderPreview';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const {
    source = 'cart',
    spaServiceId,
    servicePackageId,
    orderId,
    bookingDate,
    bookingStartTime,
    bookingEndTime,
    bookingStaffId,
    bookingStaffName,
    bookingNote,
  } = useLocalSearchParams<{
    source?: 'cart' | 'buy_now';
    spaServiceId?: string;
    servicePackageId?: string;
    orderId?: string;
    bookingDate?: string;
    bookingStartTime?: string;
    bookingEndTime?: string;
    bookingStaffId?: string;
    bookingStaffName?: string;
    bookingNote?: string;
  }>();

  const { status } = useAuthStore();
  const isExistingOrder = Boolean(orderId);
  const isBookingCheckout = Boolean(
    !isExistingOrder && spaServiceId && bookingDate && bookingStartTime,
  );

  // Auth redirect
  useEffect(() => {
    if (status === 'anonymous') {
      const returnUrl = orderId
        ? `/checkout?orderId=${orderId}`
        : `/checkout?source=${source}${spaServiceId ? `&spaServiceId=${spaServiceId}` : ''}${servicePackageId ? `&servicePackageId=${servicePackageId}` : ''}`;
      router.replace(`/(public)/login?redirect=${encodeURIComponent(returnUrl)}`);
    }
  }, [status, orderId, source, spaServiceId, servicePackageId]);

  // Mode 1: Order Preview state
  const [appliedPromotionCode, setAppliedPromotionCode] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(generateUUID());

  const previewRequest = useMemo<OrderRequest>(() => {
    return {
      source: (source as OrderSource) ?? 'cart',
      spaServiceId: spaServiceId || undefined,
      servicePackageId: servicePackageId || undefined,
      promotionCode: appliedPromotionCode || undefined,
    };
  }, [source, spaServiceId, servicePackageId, appliedPromotionCode]);

  const {
    data: preview,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    error: previewError,
    refetch: refetchPreview,
  } = useOrderPreview(previewRequest, !isExistingOrder);

  // Mode 2: Existing Order state
  const {
    data: existingOrder,
    isLoading: isOrderLoading,
    isError: isOrderError,
    error: orderError,
    refetch: refetchOrder,
  } = useOrder(orderId ?? '', isExistingOrder);

  const createOrder = useCreateOrder();
  const bookNow = useBookNow();
  const createPayment = useCreatePayment();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The order (and, for book-now, the held slot) created by this screen. A retry after a failed payment step pays
  // this order instead of creating a second one, and the slot can no longer be changed from here.
  const createdOrderIdRef = useRef<string | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);

  // Unified data
  const isLoading = isExistingOrder ? isOrderLoading : isPreviewLoading;
  const isError = isExistingOrder ? isOrderError : isPreviewError;
  const loadError = isExistingOrder ? orderError : previewError;

  const items: readonly OrderPreviewItem[] = isExistingOrder
    ? (existingOrder?.items.map((it) => ({
        type: it.type,
        productId: it.productId,
        productName: it.productName,
        unitPrice: it.unitPrice,
        discountAmount: it.discountAmount,
        lineTotal: it.lineTotal,
      })) ?? [])
    : (preview?.items ?? []);

  const unavailableItems = !isExistingOrder ? (preview?.unavailableItems ?? []) : [];
  const subtotal = isExistingOrder ? (existingOrder?.subtotal ?? 0) : (preview?.subtotal ?? 0);
  const discountTotal = isExistingOrder
    ? (existingOrder?.discountTotal ?? 0)
    : (preview?.discountTotal ?? 0);
  const grandTotal = isExistingOrder
    ? (existingOrder?.grandTotal ?? 0)
    : (preview?.grandTotal ?? 0);
  const appliedPromotion = isExistingOrder
    ? (existingOrder?.promotion ?? null)
    : (preview?.promotion ?? null);
  const promotionError = !isExistingOrder ? (preview?.promotionError ?? null) : null;
  const isPayable = isExistingOrder ? (existingOrder?.isPayable ?? true) : items.length > 0;

  const handleApplyPromotion = (code: string) => {
    idempotencyKeyRef.current = generateUUID();
    setAppliedPromotionCode(code);
  };

  const handleRemovePromotion = () => {
    idempotencyKeyRef.current = generateUUID();
    setAppliedPromotionCode(null);
  };

  const isBelowMinimum = grandTotal > 0 && grandTotal < 5000;

  const handleCheckout = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      let targetOrderId = orderId ?? createdOrderIdRef.current ?? undefined;

      if (!targetOrderId) {
        if (isBookingCheckout && spaServiceId && bookingDate && bookingStartTime) {
          // Step 1a: Book Now (Hold Appointment + Create Order with optional Promotion Code)
          const bookNowResult = await bookNow.mutateAsync({
            body: {
              spaServiceId,
              date: bookingDate,
              startTime: bookingStartTime,
              ...(bookingStaffId ? { staffMemberId: bookingStaffId } : {}),
              ...(appliedPromotionCode ? { promotionCode: appliedPromotionCode } : {}),
              ...(bookingNote ? { note: bookingNote } : {}),
            },
            idempotencyKey: idempotencyKeyRef.current,
          });
          targetOrderId = bookNowResult.order.id;
          createdOrderIdRef.current = targetOrderId;
          setOrderCreated(true);

          if (bookNowResult.order.grandTotal === 0 || bookNowResult.order.status === 'paid') {
            router.replace(`/booking/success?appointmentId=${bookNowResult.appointment.id}`);
            return;
          }
        } else {
          // Step 1b: Create Standard Order (Cart or Buy Now Package)
          const newOrder = await createOrder.mutateAsync({
            request: previewRequest,
            idempotencyKey: idempotencyKeyRef.current,
          });
          targetOrderId = newOrder.id;
          createdOrderIdRef.current = targetOrderId;
          setOrderCreated(true);

          // 0 VND order exception: Backend completes order immediately
          if (newOrder.grandTotal === 0 || newOrder.status === 'paid') {
            router.replace(`/payment/result?orderId=${targetOrderId}`);
            return;
          }
        }
      }

      // Step 2: Create Payment Attempt
      const attempt = await createPayment.mutateAsync({
        orderId: targetOrderId,
        client: 'mobile',
      });

      // Step 3: Open VNPay in an in-app browser session. It closes by itself when the API redirects to the app's
      // result deep link (PAYMENT_MOBILE_RETURN_URL), so the result screen only starts polling once the customer is done.
      // Whether it returned or the customer closed it, the result screen reads the order's real status by id.
      await WebBrowser.openAuthSessionAsync(
        attempt.paymentUrl,
        Linking.createURL('/payment/result'),
      );
      router.replace(`/payment/result?orderId=${targetOrderId}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err && typeof err === 'object' && 'errors' in err) {
        const apiErr = err as { errors: Array<{ code: string; message: string }> };
        const code = apiErr.errors?.[0]?.code;
        const slotError = isBookingCheckout ? classifyBookingError(err) : null;
        if (slotError && (slotError.shouldClearSlot || slotError.shouldResetStaff)) {
          Alert.alert('Khung giờ hẹn không còn khả dụng', slotError.message, [
            {
              text: 'Chọn giờ khác',
              onPress: () =>
                router.canGoBack()
                  ? router.back()
                  : router.replace(`/booking/new?serviceId=${spaServiceId ?? ''}`),
            },
          ]);
          return;
        }
        if (code === 'cart_empty') {
          Alert.alert('Giỏ hàng trống', 'Giỏ hàng của bạn đang trống.', [
            { text: 'Về giỏ hàng', onPress: () => router.replace('/cart') },
          ]);
          return;
        }
        if (code === 'order_items_unavailable') {
          setSubmitError('Một số sản phẩm không còn mở bán. Vui lòng kiểm tra lại.');
          void refetchPreview();
          return;
        }
        if (code === 'order_not_payable') {
          setSubmitError('Đơn hàng đã hết hạn hoặc không còn chờ thanh toán.');
          return;
        }
        if (code === 'payment_attempts_exceeded') {
          setSubmitError('Đã vượt quá số lần thử thanh toán cho phép.');
          return;
        }
        if (code === 'payment_gateway_unavailable') {
          setSubmitError('Cổng thanh toán VNPay đang bảo trì. Vui lòng thử lại sau.');
          return;
        }
      }

      setSubmitError(
        err instanceof Error ? err.message : 'Không thể khởi tạo thanh toán. Vui lòng thử lại sau.',
      );
    }
  };

  return (
    <AppScreen scroll={false} style={styles.screenContainer}>
      {/* Standalone Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/cart'))}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText style={styles.headerTitle}>Xác nhận & Thanh toán</AppText>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <AppText style={styles.loadingText}>Đang tải thông tin đơn hàng...</AppText>
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <AppNotice
            tone="error"
            title="Không thể tải thông tin thanh toán"
            message={loadError?.message ?? 'Đã có sự cố khi kết nối tới máy chủ. Vui lòng thử lại.'}
          />
          <View style={styles.retryButtonWrapper}>
            <AppButton
              title="Thử lại"
              onPress={() => (isExistingOrder ? refetchOrder() : refetchPreview())}
            />
          </View>
        </View>
      ) : (
        <View style={styles.mainContainer}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hold Banner */}
            <View style={styles.holdBanner}>
              <Clock size={16} color={colors.primary} />
              <AppText style={styles.holdBannerText}>
                {isExistingOrder && existingOrder?.paymentDueAtUtc
                  ? `Đơn hàng được giữ đến ${formatLocalTime(existingOrder.paymentDueAtUtc)}`
                  : 'Đơn hàng sẽ được giữ chỗ 15 phút để bạn hoàn tất thanh toán.'}
              </AppText>
            </View>

            {/* Unavailable items alert */}
            {unavailableItems.length > 0 && (
              <View style={styles.warningBox}>
                <AlertTriangle size={18} color={colors.warning} />
                <View style={styles.warningContent}>
                  <AppText style={styles.warningTitle}>Sản phẩm ngừng bán</AppText>
                  <AppText style={styles.warningText}>
                    Các sản phẩm sau không còn mở bán và không được tính vào đơn:{' '}
                    {unavailableItems.map((u) => u.name).join(', ')}
                  </AppText>
                </View>
              </View>
            )}

            {/* Submit error alert */}
            {submitError && (
              <View style={styles.errorBanner}>
                <AppNotice tone="error" message={submitError} />
              </View>
            )}

            {/* Booking Appointment Summary Card (when checking out from Book Now) */}
            {(isBookingCheckout || existingOrder?.appointment) && (
              <View style={styles.card}>
                <View style={styles.cardHeaderBetween}>
                  <View style={styles.cardHeaderLeft}>
                    <CalendarCheck size={18} color={colors.primary} />
                    <AppText style={styles.cardTitle}>Thông tin lịch hẹn</AppText>
                  </View>
                  {isBookingCheckout && !orderCreated && (
                    <Pressable
                      onPress={() =>
                        router.canGoBack()
                          ? router.back()
                          : router.replace(`/booking/new?serviceId=${spaServiceId ?? ''}`)
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Đổi giờ hẹn"
                    >
                      <AppText style={styles.changeSlotLink}>Đổi giờ</AppText>
                    </Pressable>
                  )}
                </View>

                <View style={styles.bookingRow}>
                  <AppText style={styles.bookingLabel}>Ngày hẹn</AppText>
                  <AppText style={styles.bookingValue}>
                    {formatLocalDate(existingOrder?.appointment?.date ?? bookingDate ?? '')}
                  </AppText>
                </View>

                <View style={styles.bookingRow}>
                  <AppText style={styles.bookingLabel}>Khung giờ</AppText>
                  <AppText style={styles.bookingValue}>
                    {existingOrder?.appointment
                      ? `${formatLocalTime(existingOrder.appointment.startTime)} – ${formatLocalTime(existingOrder.appointment.endTime)}`
                      : bookingEndTime
                        ? `${bookingStartTime} – ${bookingEndTime}`
                        : bookingStartTime}
                  </AppText>
                </View>

                <View style={styles.bookingRow}>
                  <AppText style={styles.bookingLabel}>Kỹ thuật viên</AppText>
                  <AppText style={styles.bookingValue}>
                    {existingOrder?.appointment?.staff.fullName ??
                      bookingStaffName ??
                      'Kỹ thuật viên bất kỳ'}
                  </AppText>
                </View>

                {bookingNote ? (
                  <View style={styles.bookingRow}>
                    <AppText style={styles.bookingLabel}>Ghi chú</AppText>
                    <AppText style={styles.bookingValue} numberOfLines={2}>
                      {bookingNote}
                    </AppText>
                  </View>
                ) : null}
              </View>
            )}

            {/* Products Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShoppingBag size={18} color={colors.primary} />
                <AppText style={styles.cardTitle}>Sản phẩm thanh toán ({items.length})</AppText>
              </View>

              {items.length === 0 ? (
                <AppText style={styles.emptyItemsText}>
                  Không có sản phẩm nào khả dụng để thanh toán.
                </AppText>
              ) : (
                items.map((item, index) => (
                  <CheckoutProductItem key={`${item.productId}-${index}`} item={item} />
                ))
              )}
            </View>

            {/* Promotion Card (only in prepare mode) */}
            {!isExistingOrder && (
              <PromotionInputCard
                appliedPromotion={appliedPromotion}
                promotionError={promotionError}
                onApply={handleApplyPromotion}
                onRemove={handleRemovePromotion}
                isLoading={isPreviewLoading}
              />
            )}

            {/* Payment Method Selector */}
            <PaymentMethodSelector />

            {/* Order Totals Card */}
            <OrderTotalsCard
              subtotal={subtotal}
              discountTotal={discountTotal}
              grandTotal={grandTotal}
              promotionCode={appliedPromotion?.code}
            />

            {/* Minimum VNPay payment warning */}
            {isBelowMinimum && (
              <AppNotice tone="info" message="Mức thanh toán tối thiểu qua VNPay là 5.000 đ." />
            )}
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={styles.totalInfo}>
              <AppText style={styles.totalLabel}>Tổng thanh toán</AppText>
              <AppText style={styles.totalAmount} numberOfLines={1}>
                {formatCurrency(grandTotal)}
              </AppText>
            </View>
            <View style={styles.payButtonWrapper}>
              <AppButton
                title={grandTotal === 0 ? 'Xác nhận đơn (0 đ)' : 'Thanh toán VNPay'}
                onPress={handleCheckout}
                loading={
                  isSubmitting ||
                  createOrder.isPending ||
                  bookNow.isPending ||
                  createPayment.isPending
                }
                disabled={
                  !isPayable ||
                  items.length === 0 ||
                  isBelowMinimum ||
                  isSubmitting ||
                  createOrder.isPending ||
                  bookNow.isPending ||
                  createPayment.isPending
                }
                accessibilityLabel="Xác nhận và tiến hành thanh toán"
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
    backgroundColor: colors.card,
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
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  retryButtonWrapper: {
    marginTop: spacing.md,
    width: 160,
  },
  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  holdBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.small,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    lineHeight: 18,
  },
  errorBanner: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  changeSlotLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  bookingLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  bookingValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptyItemsText: {
    fontSize: 13,
    color: colors.muted,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  totalInfo: {
    flex: 1,
    marginRight: spacing.md,
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
  payButtonWrapper: {
    minWidth: 180,
  },
});
