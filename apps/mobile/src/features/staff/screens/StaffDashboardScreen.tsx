import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/stores/authStore';
import { getTodayVnDate } from '@/features/bookings/utils/bookingHelpers';
import { formatFullVnDate, isCurrentlyInShift } from '../utils/scheduleHelpers';
import { useMyWorkSchedules } from '../hooks/useMyWorkSchedules';
import { useAssignedAppointments } from '@/features/care/hooks/useAssignedAppointments';
import { LogOutButton } from '@/features/auth/components/LogOutButton';
import { NotificationBellButton } from '@/features/notifications';
import {
  CalendarDays,
  CalendarCheck,
  History,
  Clock,
  Sparkles,
  Coffee,
  ChevronRight,
  User,
} from 'lucide-react-native';

export function StaffDashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const todayVn = useMemo(() => getTodayVnDate(), []);

  // Fetch today's shifts (fromDate = toDate = today)
  const { data: todayShifts = [] } = useMyWorkSchedules({
    fromDate: todayVn,
    toDate: todayVn,
  });

  // Fetch today's appointments
  const { data: todayAppointments = [] } = useAssignedAppointments({
    fromDate: todayVn,
    toDate: todayVn,
  });

  const activeShift = todayShifts.find((s) => s.status !== 'cancelled');
  const isShiftLive = activeShift
    ? isCurrentlyInShift(todayVn, activeShift.startTime, activeShift.endTime)
    : false;

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Header with Greeting & Date */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.headerTextGroup}>
          <AppText style={styles.greetingText}>Xin chào,</AppText>
          <AppText accessibilityRole="header" style={styles.userName}>
            {user?.fullName ?? 'Kỹ thuật viên'}
          </AppText>
          <AppText style={styles.dateText}>{formatFullVnDate(todayVn)}</AppText>
        </View>
        <NotificationBellButton />
      </View>

      <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrap}>
          {/* Today's Shift Card */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CalendarDays size={16} color={colors.primary} />
              <AppText style={styles.sectionTitle}>Ca làm việc hôm nay</AppText>
            </View>

            {activeShift ? (
              <Pressable
                style={({ pressed }) => [
                  styles.shiftCard,
                  isShiftLive && styles.shiftCardLive,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => router.push('/(staff)/schedule')}
                accessibilityRole="button"
                accessibilityLabel="Xem chi tiết ca làm việc hôm nay"
              >
                <View style={styles.shiftCardTop}>
                  <View style={styles.shiftTimeBadge}>
                    <Clock size={14} color={colors.primaryPressed} />
                    <AppText style={styles.shiftTimeText}>
                      {activeShift.startTime} – {activeShift.endTime}
                    </AppText>
                  </View>

                  {isShiftLive ? (
                    <View style={styles.liveTag}>
                      <Sparkles size={10} color={colors.onPrimary} />
                      <AppText style={styles.liveTagText}>Đang trong ca</AppText>
                    </View>
                  ) : null}
                </View>

                <View style={styles.shiftCardBottom}>
                  <AppText style={styles.shiftAptCount}>
                    {activeShift.appointmentCount > 0
                      ? `${activeShift.appointmentCount} lịch hẹn cần phục vụ`
                      : 'Chưa có lịch hẹn nào'}
                  </AppText>
                  <View style={styles.cardArrow}>
                    <AppText style={styles.cardArrowText}>Xem lịch tuần</AppText>
                    <ChevronRight size={14} color={colors.primary} />
                  </View>
                </View>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.dayOffCard, pressed && styles.cardPressed]}
                onPress={() => router.push('/(staff)/schedule')}
                accessibilityRole="button"
                accessibilityLabel="Xem lịch làm việc"
              >
                <Coffee size={20} color={colors.tabBarInactive} />
                <View style={styles.dayOffInfo}>
                  <AppText style={styles.dayOffTitle}>Hôm nay bạn không có ca</AppText>
                  <AppText style={styles.dayOffSub}>Chạm để xem lịch làm việc các ngày khác</AppText>
                </View>
                <ChevronRight size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {/* Today's Assigned Appointments Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CalendarCheck size={16} color={colors.primary} />
              <AppText style={styles.sectionTitle}>Lịch hẹn hôm nay ({todayAppointments.length})</AppText>
              {todayAppointments.length > 0 ? (
                <Pressable
                  onPress={() => router.push('/(staff)/bookings')}
                  hitSlop={8}
                  style={styles.seeAllLink}
                >
                  <AppText style={styles.seeAllText}>Xem tất cả</AppText>
                  <ChevronRight size={12} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>

            {todayAppointments.length === 0 ? (
              <Pressable
                style={({ pressed }) => [styles.emptyAptCard, pressed && styles.cardPressed]}
                onPress={() => router.push('/(staff)/bookings')}
                accessibilityRole="button"
                accessibilityLabel="Xem danh sách lịch hẹn"
              >
                <AppText style={styles.emptyAptText}>
                  Bạn chưa có lịch hẹn nào được phân công hôm nay.
                </AppText>
              </Pressable>
            ) : (
              <View style={styles.aptList}>
                {todayAppointments.slice(0, 3).map((apt) => (
                  <Pressable
                    key={apt.id}
                    style={({ pressed }) => [styles.aptCard, pressed && styles.cardPressed]}
                    onPress={() => router.push(`/(staff)/bookings/${apt.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Buổi chăm sóc ${apt.service.name} cho khách ${apt.customer.fullName}`}
                  >
                    <View style={styles.aptTopRow}>
                      <View style={styles.aptTimeBadge}>
                        <Clock size={11} color={colors.primaryPressed} />
                        <AppText style={styles.aptTimeText}>
                          {apt.startTime} – {apt.endTime}
                        </AppText>
                      </View>
                      <AppText style={styles.aptCustomerName}>
                        <User size={11} color={colors.muted} /> {apt.customer.fullName}
                      </AppText>
                    </View>
                    <AppText style={styles.aptServiceName}>{apt.service.name}</AppText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Quick Shortcuts */}
          <View style={styles.section}>
            <AppText style={styles.shortcutsTitle}>Lối tắt nhanh</AppText>
            <View style={styles.shortcutGrid}>
              <Pressable
                onPress={() => router.push('/(staff)/schedule')}
                style={styles.shortcutBtn}
              >
                <View style={styles.shortcutIconWrap}>
                  <CalendarDays size={20} color={colors.primary} />
                </View>
                <AppText style={styles.shortcutLabel}>Lịch làm việc</AppText>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(staff)/bookings')}
                style={styles.shortcutBtn}
              >
                <View style={styles.shortcutIconWrap}>
                  <CalendarCheck size={20} color={colors.primary} />
                </View>
                <AppText style={styles.shortcutLabel}>Lịch hẹn</AppText>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(staff)/care-history')}
                style={styles.shortcutBtn}
              >
                <View style={styles.shortcutIconWrap}>
                  <History size={20} color={colors.primary} />
                </View>
                <AppText style={styles.shortcutLabel}>Lịch sử chăm sóc</AppText>
              </Pressable>
            </View>
          </View>

          {/* Log Out */}
          <View style={styles.logoutWrap}>
            <LogOutButton />
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTextGroup: {
    gap: 2,
  },
  greetingText: {
    fontSize: 13,
    color: colors.muted,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  dateText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollBody: {
    flex: 1,
  },
  contentWrap: {
    padding: 16,
    gap: 18,
    paddingBottom: 32,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  seeAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  cardPressed: {
    opacity: 0.85,
    backgroundColor: colors.surface,
  },
  shiftCard: {
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  shiftCardLive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  shiftCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  shiftTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  shiftCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  shiftAptCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  cardArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardArrowText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  dayOffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayOffInfo: {
    flex: 1,
  },
  dayOffTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  dayOffSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  emptyAptCard: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyAptText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
  aptList: {
    gap: 8,
  },
  aptCard: {
    padding: 12,
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aptTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aptTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  aptCustomerName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  aptServiceName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  shortcutsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
  },
  shortcutGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 80,
  },
  shortcutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  logoutWrap: {
    marginTop: 8,
  },
});
