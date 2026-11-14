import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck2, Clock, Package, ShieldCheck, User, X } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { formatDateTimeUtc, formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';
import { useMyAppointmentDetail } from '../hooks/useMyAppointmentDetail';
import { getBookingSourceLabel } from '../utils/bookingHelpers';

export function BookingSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  const {
    data: appointment,
    purchasedPackage,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyAppointmentDetail(appointmentId);

  return (
    <AppScreen scroll={false} style={styles.screenContainer}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.headerSpacer} />
        <AppText style={styles.headerTitle}>Xác nhận lịch hẹn</AppText>
        <Pressable
          onPress={() => router.replace('/(customer)/home')}
          accessibilityRole="button"
          accessibilityLabel="Đóng và về trang chủ"
          hitSlop={8}
          style={styles.closeBtn}
        >
          <X size={22} color={colors.text} />
        </Pressable>
      </View>

      {!appointmentId ? (
        <View style={styles.centerBox}>
          <AppNotice
            tone="error"
            title="Thiếu mã lịch hẹn"
            message="Không tìm thấy mã lịch hẹn cần hiển thị."
          />
          <View style={styles.centerActions}>
            <AppButton
              title="Xem lịch hẹn của tôi"
              onPress={() => router.replace('/(customer)/bookings')}
            />
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải thông tin lịch hẹn...</AppText>
        </View>
      ) : isError || !appointment ? (
        <View style={styles.centerBox}>
          <AppNotice
            tone="error"
            title="Không tải được lịch hẹn"
            message={error?.message ?? 'Đã có lỗi khi tải chi tiết lịch hẹn của bạn.'}
          />
          <View style={styles.centerActions}>
            <AppButton title="Thử lại" onPress={() => void refetch()} />
            <AppButton
              title="Xem lịch hẹn của tôi"
              variant="outline"
              onPress={() => router.replace('/(customer)/bookings')}
            />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: spacing.xl + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Ticket Card */}
          <View style={styles.ticketCard}>
            <View style={styles.iconCircle}>
              <CalendarCheck2 size={42} color={colors.success} />
            </View>
            <AppText style={styles.title}>Đặt lịch hẹn thành công!</AppText>
            <AppText style={styles.subtitle}>
              Chúng tôi đã ghi nhận lịch hẹn của bạn tại Như Nguyệt Spa.
            </AppText>

            <View style={styles.statusWrap}>
              <AppointmentStatusBadge status={appointment.status} />
            </View>

            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Dịch vụ</AppText>
                <AppText style={styles.detailValue}>{appointment.service.name}</AppText>
              </View>

              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Ngày & Giờ hẹn</AppText>
                <View style={styles.inlineRow}>
                  <Clock size={13} color={colors.primary} />
                  <AppText style={styles.detailHighlight}>
                    {formatLocalTime(appointment.startTime)} –{' '}
                    {formatLocalTime(appointment.endTime)}, {formatLocalDate(appointment.date)}
                  </AppText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Kỹ thuật viên</AppText>
                <View style={styles.inlineRow}>
                  <User size={13} color={colors.muted} />
                  <AppText style={styles.detailValue}>{appointment.staff.fullName}</AppText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <AppText style={styles.detailLabel}>Nguồn đặt lịch</AppText>
                <AppText style={styles.detailValue}>
                  {getBookingSourceLabel(appointment.source, appointment.treatmentSession)}
                </AppText>
              </View>

              {appointment.order && (
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Mã đơn hàng</AppText>
                  <AppText style={styles.detailValue}>{appointment.order.code}</AppText>
                </View>
              )}
            </View>

            {/* Package Progress Bar if session */}
            {purchasedPackage && (
              <View style={styles.packageProgressBox}>
                <View style={styles.packageHeaderRow}>
                  <Package size={15} color={colors.primary} />
                  <AppText style={styles.packageTitle}>
                    Tiến độ gói: {purchasedPackage.packageName}
                  </AppText>
                </View>
                <AppText style={styles.packageSub}>
                  Đã hoàn thành {purchasedPackage.usedSessions}/{purchasedPackage.totalSessions}{' '}
                  buổi · Đang đặt lịch {purchasedPackage.bookedSessions} buổi
                </AppText>
              </View>
            )}

            {/* Policy & Deadline Notice */}
            {appointment.changeDeadlineAtUtc && (
              <View style={styles.policyBox}>
                <ShieldCheck size={16} color={colors.primary} />
                <AppText style={styles.policyText}>
                  Bạn có thể đổi hoặc hủy lịch trực tuyến trước{' '}
                  {formatDateTimeUtc(appointment.changeDeadlineAtUtc)} (tối thiểu 24 giờ trước giờ
                  hẹn).
                </AppText>
              </View>
            )}
          </View>

          {/* Navigation CTAs */}
          <View style={styles.actionsBox}>
            <AppButton
              title="Xem chi tiết lịch hẹn"
              onPress={() => router.replace(`/booking/${appointment.id}`)}
            />
            <AppButton
              title="Xem danh sách lịch hẹn"
              variant="outline"
              onPress={() => router.replace('/(customer)/bookings')}
            />
            <AppButton
              title="Về trang chủ"
              variant="outline"
              onPress={() => router.replace('/(customer)/home')}
            />
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
  headerSpacer: {
    width: 48,
  },
  closeBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
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
  ticketCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  statusWrap: {
    marginVertical: 4,
  },
  detailsBox: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 4,
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
  detailHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packageProgressBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.md,
    gap: 4,
    marginTop: spacing.xs,
  },
  packageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  packageSub: {
    fontSize: 12,
    color: colors.text,
  },
  policyBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  actionsBox: {
    gap: spacing.sm,
  },
});
