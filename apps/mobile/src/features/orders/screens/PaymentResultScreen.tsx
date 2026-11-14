import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { formatCurrency, formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { PaymentStatusIcon } from '../components/PaymentStatusIcon';
import { latestPayment, useOrderPolling } from '../hooks/useOrderPolling';

export function PaymentResultScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, error: queryError } = useLocalSearchParams<{
    orderId?: string;
    error?: string;
  }>();

  const {
    order,
    isLoading,
    isError,
    error: loadError,
    refetch,
    isPolling,
    isPollingTimeout,
  } = useOrderPolling(orderId);

  const hasPackage = order?.items.some((it) => it.type === 'package');
  const hasService = order?.items.some((it) => it.type === 'service');
  const latestAttempt = order ? latestPayment(order) : undefined;
  const isFailedAttempt = order?.status === 'pending_payment' && latestAttempt?.status === 'failed';

  return (
    <AppScreen scroll={false} style={styles.screenContainer}>
      {/* Standalone Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.headerSpacer} />
        <AppText style={styles.headerTitle}>Kết quả thanh toán</AppText>
        <Pressable
          onPress={() => router.replace('/(customer)/home')}
          accessibilityRole="button"
          accessibilityLabel="Đóng và về trang chủ"
          hitSlop={8}
          style={styles.closeButton}
        >
          <X size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Missing orderId check */}
      {!orderId ? (
        <View style={styles.centeredContainer}>
          <AppNotice
            tone="error"
            title="Không tìm thấy đơn hàng"
            message="Không tìm thấy thông tin kết quả giao dịch thanh toán."
          />
          <View style={styles.actionButtonWrapper}>
            <AppButton title="Về trang chủ" onPress={() => router.replace('/(customer)/home')} />
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải thông tin kết quả thanh toán...</AppText>
        </View>
      ) : isError ? (
        <View style={styles.centeredContainer}>
          <AppNotice
            tone="error"
            title="Lỗi tải thông tin đơn hàng"
            message={loadError?.message ?? 'Đã có sự cố khi kết nối tới máy chủ. Vui lòng thử lại.'}
          />
          <View style={styles.actionButtonWrapper}>
            <AppButton title="Kiểm tra lại" onPress={() => refetch()} />
          </View>
        </View>
      ) : !order ? null : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: spacing.xl + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Invalid verification signature notice */}
          {queryError === 'invalid_payment_result' && (
            <View style={styles.noticeWrapper}>
              <AppNotice
                tone="error"
                message="Không thể xác thực tính toàn vẹn của kết quả giao dịch. Vui lòng kiểm tra lại trạng thái đơn hàng hoặc liên hệ nhân viên spa để được hỗ trợ."
              />
            </View>
          )}

          {/* Polling Banner */}
          {isPolling && (
            <View style={styles.pollingBanner}>
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText style={styles.pollingText}>Đang xác nhận giao dịch từ ngân hàng...</AppText>
            </View>
          )}

          {/* Polling Timeout Banner */}
          {isPollingTimeout && order.status === 'pending_payment' && (
            <View style={styles.timeoutBanner}>
              <AppNotice
                tone="info"
                message="Hệ thống đang xử lý giao dịch. Nếu tài khoản của bạn đã bị trừ tiền, dịch vụ sẽ được kích hoạt tự động trong ít phút."
              />
              <View style={styles.refetchButtonWrapper}>
                <AppButton
                  title="Kiểm tra lại trạng thái"
                  variant="outline"
                  onPress={() => refetch()}
                />
              </View>
            </View>
          )}

          {/* Centered Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.iconWrapper}>
              <PaymentStatusIcon
                orderStatus={order.status}
                latestPaymentStatus={latestAttempt?.status}
                size={84}
              />
            </View>

            {/* Status Titles */}
            {order.status === 'paid' ? (
              <>
                <AppText style={styles.statusTitle}>Thanh toán thành công!</AppText>
                <AppText style={styles.statusSubtitle}>
                  Dịch vụ đã được kích hoạt trong tài khoản của bạn.
                </AppText>
              </>
            ) : isFailedAttempt ? (
              <>
                <AppText style={styles.statusTitle}>Giao dịch chưa hoàn tất</AppText>
                <AppText style={styles.statusSubtitle}>
                  Giao dịch qua VNPay không thành công hoặc bạn đã hủy giao dịch.
                  {order.paymentDueAtUtc &&
                    ` Đơn hàng được giữ đến ${formatLocalTime(order.paymentDueAtUtc)}.`}
                </AppText>
              </>
            ) : order.status === 'expired' ? (
              <>
                <AppText style={styles.statusTitle}>Đơn hàng đã hết hạn</AppText>
                <AppText style={styles.statusSubtitle}>
                  Đơn hàng đã quá thời hạn thanh toán 15 phút.
                </AppText>
              </>
            ) : order.status === 'cancelled' ? (
              <>
                <AppText style={styles.statusTitle}>Đơn hàng đã bị hủy</AppText>
                <AppText style={styles.statusSubtitle}>
                  {order.cancellationReason || 'Đơn hàng đã được hủy.'}
                </AppText>
              </>
            ) : (
              <>
                <AppText style={styles.statusTitle}>Đang chờ thanh toán</AppText>
                <AppText style={styles.statusSubtitle}>
                  Vui lòng hoàn tất thanh toán trước khi đơn hàng hết hạn.
                </AppText>
              </>
            )}

            {/* Order Details Summary */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Mã đơn hàng</AppText>
                <AppText style={styles.detailCode}>{order.code}</AppText>
              </View>

              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Tổng thanh toán</AppText>
                <AppText style={styles.detailAmount}>{formatCurrency(order.grandTotal)}</AppText>
              </View>

              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Phương thức</AppText>
                <AppText style={styles.detailValue}>Cổng VNPay</AppText>
              </View>

              {latestAttempt?.paidAtUtc && (
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Thời gian thanh toán</AppText>
                  <AppText style={styles.detailValue}>
                    {formatLocalTime(latestAttempt.paidAtUtc)}
                  </AppText>
                </View>
              )}
            </View>

            {/* Items Summary */}
            <View style={styles.itemsSummary}>
              <AppText style={styles.itemsHeader}>Sản phẩm đã chọn:</AppText>
              {order.items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <AppText style={styles.itemName} numberOfLines={1}>
                    • {it.productName}
                  </AppText>
                  <AppText style={styles.itemPrice}>{formatCurrency(it.lineTotal)}</AppText>
                </View>
              ))}
            </View>

            {/* Linked Appointment Summary (Book Now Flow) */}
            {order.appointment && (
              <View style={styles.appointmentSummary}>
                <AppText style={styles.appointmentHeader}>Thông tin lịch hẹn đi kèm:</AppText>
                <View style={styles.itemRow}>
                  <AppText style={styles.detailLabel}>Ngày & Giờ hẹn</AppText>
                  <AppText style={styles.itemPrice}>
                    {formatLocalTime(order.appointment.startTime)} –{' '}
                    {formatLocalTime(order.appointment.endTime)},{' '}
                    {formatLocalDate(order.appointment.date)}
                  </AppText>
                </View>
                <View style={styles.itemRow}>
                  <AppText style={styles.detailLabel}>Kỹ thuật viên</AppText>
                  <AppText style={styles.itemPrice}>{order.appointment.staff.fullName}</AppText>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {order.status === 'paid' ? (
              <>
                {order.appointment ? (
                  <AppButton
                    title="Xem lịch hẹn vừa đặt"
                    variant="primary"
                    onPress={() =>
                      router.replace(`/booking/success?appointmentId=${order.appointment!.id}`)
                    }
                  />
                ) : (
                  <AppButton
                    title="Đặt lịch hẹn ngay"
                    variant="primary"
                    onPress={() => router.replace('/(customer)/bookings')}
                  />
                )}
                {hasPackage && (
                  <AppButton
                    title="Xem gói của tôi"
                    variant="outline"
                    onPress={() => router.replace('/(customer)/packages')}
                  />
                )}
                {hasService && !order.appointment && (
                  <AppButton
                    title="Xem dịch vụ đã mua"
                    variant="outline"
                    onPress={() => router.replace('/(customer)/packages?tab=services')}
                  />
                )}
                <AppButton
                  title="Khám phá thêm dịch vụ"
                  variant="outline"
                  onPress={() => router.replace('/(public)/services')}
                />
              </>
            ) : isFailedAttempt ? (
              <>
                {order.isPayable && (
                  <AppButton
                    title="Thử lại thanh toán"
                    variant="primary"
                    onPress={() => router.replace(`/checkout?orderId=${order.id}`)}
                  />
                )}
                <AppButton
                  title="Về giỏ hàng"
                  variant="outline"
                  onPress={() => router.replace('/cart')}
                />
                <AppButton
                  title="Về trang chủ"
                  variant="outline"
                  onPress={() => router.replace('/(customer)/home')}
                />
              </>
            ) : order.status === 'expired' ? (
              <>
                <AppButton
                  title="Đặt mua lại"
                  variant="primary"
                  onPress={() => router.replace('/cart')}
                />
                <AppButton
                  title="Về trang chủ"
                  variant="outline"
                  onPress={() => router.replace('/(customer)/home')}
                />
              </>
            ) : (
              <AppButton
                title="Về trang chủ"
                variant="primary"
                onPress={() => router.replace('/(customer)/home')}
              />
            )}
          </View>
        </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerSpacer: {
    width: 48,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.muted,
  },
  actionButtonWrapper: {
    marginTop: spacing.lg,
    width: 200,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  noticeWrapper: {
    marginBottom: spacing.md,
  },
  pollingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.small,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  pollingText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  timeoutBanner: {
    marginBottom: spacing.md,
  },
  refetchButtonWrapper: {
    marginTop: spacing.sm,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconWrapper: {
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statusSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  detailsContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  detailCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  itemsSummary: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.md,
  },
  itemsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginRight: spacing.sm,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  appointmentSummary: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 4,
  },
  appointmentHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  actionsContainer: {
    gap: spacing.sm,
  },
});
