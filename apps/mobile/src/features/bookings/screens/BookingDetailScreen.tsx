import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { errorCodeOf } from '@spa/api-client';
import { useCreatePayment } from '@/features/orders';
import { formatDateTimeUtc, formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';
import { CancelAppointmentModal } from '../components/CancelAppointmentModal';
import { HoldCountdownBadge } from '../components/HoldCountdownBadge';
import { RescheduleAppointmentModal } from '../components/RescheduleAppointmentModal';
import { useMyAppointmentDetail } from '../hooks/useMyAppointmentDetail';
import { getBookingSourceLabel } from '../utils/bookingHelpers';

export function BookingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();

  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  // Set by the countdown when the hold deadline passes, before the server has marked the hold expired.
  const [holdElapsed, setHoldElapsed] = useState(false);

  const {
    data: appointment,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyAppointmentDetail(bookingId);

  const createPaymentMutation = useCreatePayment();

  const handlePayNow = async () => {
    if (!appointment?.order) return;
    try {
      const payment = await createPaymentMutation.mutateAsync({
        orderId: appointment.order.id,
        client: 'mobile',
      });
      await WebBrowser.openAuthSessionAsync(
        payment.paymentUrl,
        Linking.createURL('/payment/result'),
      );
      router.push(`/payment/result?orderId=${appointment.order.id}`);
    } catch (err) {
      const code = errorCodeOf(err);
      if (code === 'order_not_payable') {
        void refetch();
        Alert.alert(
          'Lịch giữ chỗ đã hết hạn',
          'Đơn hàng không còn chờ thanh toán. Vui lòng đặt lại khung giờ khác.',
        );
        return;
      }
      if (code === 'payment_attempts_exceeded') {
        Alert.alert('Thông báo', 'Đã vượt quá số lần thử thanh toán cho đơn hàng này.');
        return;
      }
      if (code === 'payment_gateway_unavailable') {
        Alert.alert('Thông báo', 'Cổng thanh toán VNPay đang bảo trì. Vui lòng thử lại sau.');
        return;
      }
      Alert.alert(
        'Thông báo',
        'Không mở được cổng VNPay. Vui lòng kiểm tra kết nối mạng và thử lại.',
      );
    }
  };

  const isHeldPayable =
    appointment?.status === 'held' &&
    appointment.order?.status === 'pending_payment' &&
    !holdElapsed;

  const isActivePastCutoff =
    (appointment?.status === 'pending_confirmation' || appointment?.status === 'confirmed') &&
    !appointment.canReschedule &&
    !appointment.canCancel;

  return (
    <AppScreen scroll={false} style={styles.screenContainer}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(customer)/bookings');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Quay lại danh sách lịch hẹn"
          hitSlop={8}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText style={styles.headerTitle}>Chi tiết lịch hẹn</AppText>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải chi tiết lịch hẹn...</AppText>
        </View>
      ) : isError || !appointment ? (
        <View style={styles.centerBox}>
          <AppNotice
            tone="error"
            title="Không tìm thấy lịch hẹn"
            message={error?.message ?? 'Lịch hẹn không tồn tại hoặc bạn không có quyền truy cập.'}
          />
          <View style={styles.centerActions}>
            <AppButton title="Thử lại" onPress={() => void refetch()} />
            <AppButton
              title="Quay lại danh sách"
              variant="outline"
              onPress={() => router.replace('/(customer)/bookings')}
            />
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  appointment.canReschedule || appointment.canCancel
                    ? 100 + insets.bottom
                    : spacing.xl + insets.bottom,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Status & DateTime Card */}
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <AppointmentStatusBadge status={appointment.status} />
                {appointment.status === 'held' && appointment.holdExpiresAtUtc && (
                  <HoldCountdownBadge
                    holdExpiresAtUtc={appointment.holdExpiresAtUtc}
                    onExpired={() => {
                      setHoldElapsed(true);
                      void refetch();
                    }}
                  />
                )}
              </View>

              <AppText style={styles.serviceTitle}>{appointment.service.name}</AppText>

              <View style={styles.dateTimeBox}>
                <View style={styles.infoRow}>
                  <Calendar size={16} color={colors.primary} />
                  <AppText style={styles.dateTimeText}>
                    Ngày hẹn: {formatLocalDate(appointment.date)}
                  </AppText>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={16} color={colors.primary} />
                  <AppText style={styles.dateTimeText}>
                    Khung giờ: {formatLocalTime(appointment.startTime)} –{' '}
                    {formatLocalTime(appointment.endTime)}
                  </AppText>
                </View>
              </View>

              {/* Held Payment Callout */}
              {isHeldPayable && appointment.order && (
                <View style={styles.heldPaymentBox}>
                  <View style={styles.heldPaymentHeader}>
                    <CreditCard size={16} color={colors.warning} />
                    <AppText style={styles.heldPaymentTitle}>
                      Hoàn tất thanh toán để xác nhận lịch hẹn
                    </AppText>
                  </View>
                  <AppText style={styles.heldPaymentSub}>
                    Đơn hàng {appointment.order.code} đang chờ thanh toán qua VNPay.
                  </AppText>
                  <View style={styles.heldPaymentBtns}>
                    <AppButton
                      title={
                        createPaymentMutation.isPending
                          ? 'Đang mở cổng VNPay...'
                          : 'Thanh toán ngay (VNPay)'
                      }
                      onPress={() => void handlePayNow()}
                      disabled={createPaymentMutation.isPending}
                    />
                    <AppButton
                      title="Xem đơn thanh toán"
                      variant="outline"
                      onPress={() => router.push(`/checkout?orderId=${appointment.order!.id}`)}
                    />
                  </View>
                </View>
              )}

              {/* Cancelled Callout */}
              {appointment.status === 'cancelled' && (
                <View style={styles.cancelledBox}>
                  <AppText style={styles.cancelledTitle}>Thông tin hủy lịch hẹn</AppText>
                  {appointment.cancelledAtUtc && (
                    <AppText style={styles.cancelledSub}>
                      Thời gian hủy: {formatDateTimeUtc(appointment.cancelledAtUtc)}
                    </AppText>
                  )}
                  {appointment.cancellationReason && (
                    <AppText style={styles.cancelledReason}>
                      Lý do: {appointment.cancellationReason}
                    </AppText>
                  )}
                </View>
              )}
            </View>

            {/* Technician & Booking Source Card */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Chi tiết kỹ thuật viên & nguồn đặt</AppText>

              <View style={styles.detailRow}>
                <View style={styles.detailLabelWrap}>
                  <User size={15} color={colors.muted} />
                  <AppText style={styles.detailLabel}>Kỹ thuật viên</AppText>
                </View>
                <AppText style={styles.detailValue}>{appointment.staff.fullName}</AppText>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailLabelWrap}>
                  <Sparkles size={15} color={colors.muted} />
                  <AppText style={styles.detailLabel}>Nguồn đặt lịch</AppText>
                </View>
                <AppText style={styles.detailValue}>
                  {getBookingSourceLabel(appointment.source, appointment.treatmentSession)}
                </AppText>
              </View>

              {appointment.order && (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <CreditCard size={15} color={colors.muted} />
                    <AppText style={styles.detailLabel}>Mã đơn hàng</AppText>
                  </View>
                  <AppText style={styles.detailValue}>{appointment.order.code}</AppText>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={styles.detailLabelWrap}>
                  <Clock size={15} color={colors.muted} />
                  <AppText style={styles.detailLabel}>Thời gian tạo</AppText>
                </View>
                <AppText style={styles.detailValue}>
                  {formatDateTimeUtc(appointment.createdAtUtc)}
                </AppText>
              </View>

              {appointment.note && (
                <View style={styles.noteBox}>
                  <View style={styles.detailLabelWrap}>
                    <FileText size={14} color={colors.primary} />
                    <AppText style={styles.noteLabel}>Ghi chú của bạn cho kỹ thuật viên:</AppText>
                  </View>
                  <AppText style={styles.noteText}>{appointment.note}</AppText>
                </View>
              )}

              <Pressable
                onPress={() => router.push(`/(public)/services/${appointment.service.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Xem thông tin dịch vụ ${appointment.service.name}`}
                style={styles.viewServiceBtn}
              >
                <AppText style={styles.viewServiceText}>Xem thông tin dịch vụ →</AppText>
              </Pressable>
            </View>

            {/* Policy Card */}
            {(appointment.changeDeadlineAtUtc || isActivePastCutoff) && (
              <View style={styles.policyCard}>
                <ShieldCheck size={18} color={colors.primary} />
                <AppText style={styles.policyText}>
                  {isActivePastCutoff
                    ? 'Đã quá thời hạn đổi/hủy trực tuyến (trước giờ hẹn 24 giờ). Nếu có việc đột xuất, vui lòng liên hệ trực tiếp quầy lễ tân spa để được hỗ trợ.'
                    : `Bạn có thể đổi giờ hoặc hủy lịch hẹn trực tuyến trước ${formatDateTimeUtc(appointment.changeDeadlineAtUtc!)} (tối thiểu 24 giờ trước giờ hẹn).`}
                </AppText>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions Bar */}
          {(appointment.canReschedule || appointment.canCancel) && (
            <View
              style={[styles.bottomBar, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}
            >
              {appointment.canCancel && (
                <View style={styles.bottomBtnWrap}>
                  <AppButton
                    title="Hủy lịch hẹn"
                    variant="outline"
                    onPress={() => setShowCancel(true)}
                  />
                </View>
              )}
              {appointment.canReschedule && (
                <View style={styles.bottomBtnWrap}>
                  <AppButton title="Đổi giờ hẹn" onPress={() => setShowReschedule(true)} />
                </View>
              )}
            </View>
          )}

          {/* Modals */}
          <RescheduleAppointmentModal
            visible={showReschedule}
            appointment={appointment}
            onClose={() => setShowReschedule(false)}
            onSuccess={() => void refetch()}
          />

          <CancelAppointmentModal
            visible={showCancel}
            appointment={appointment}
            onClose={() => setShowCancel(false)}
            onSuccess={() => void refetch()}
          />
        </>
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
  backBtn: {
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  centerActions: {
    width: '100%',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
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
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  serviceTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  dateTimeBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.sm,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  heldPaymentBox: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.small,
    padding: spacing.md,
    gap: spacing.xs,
  },
  heldPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heldPaymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
    flex: 1,
  },
  heldPaymentSub: {
    fontSize: 12,
    color: colors.warning,
  },
  heldPaymentBtns: {
    gap: spacing.xs,
    marginTop: 4,
  },
  cancelledBox: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    borderRadius: radius.small,
    padding: spacing.md,
    gap: 4,
  },
  cancelledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  cancelledSub: {
    fontSize: 12,
    color: colors.error,
  },
  cancelledReason: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  detailLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    flexShrink: 1,
  },
  noteBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.sm,
    gap: 4,
    marginTop: 4,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  noteText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  viewServiceBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginTop: 2,
  },
  viewServiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.md,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
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
    paddingTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bottomBtnWrap: {
    flex: 1,
  },
});
