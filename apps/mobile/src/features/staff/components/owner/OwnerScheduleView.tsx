import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { StaffListItem, WorkScheduleItem } from '@spa/shared-types';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
import { AppLoader } from '@components/common/AppLoader';
import { AppText } from '@components/common/AppText';
import { ErrorState } from '@components/common/ErrorState';
import { formatLocalTime } from '@/lib/formatting/formatters';
import { addDaysToDate, getTodayVnDate } from '@features/bookings/utils/bookingHelpers';
import { colors, radius, spacing } from '@theme/index';
import { useOwnerWorkSchedules } from '../../hooks/useOwnerWorkSchedules';
import {
  formatWeekHeader,
  generateWeekDays,
  getMondayOfDate,
  getSundayOfMonday,
} from '../../utils/scheduleHelpers';

/**
 * The owner's read-only week of shifts (UC-SPA-23): every working staff member or one of them, grouped by day.
 * Adding, moving or cancelling shifts stays on the web workspace.
 */
export function OwnerScheduleView({
  monday,
  onMondayChange,
  staff,
  staffMemberId,
  onStaffChange,
}: {
  monday: string;
  onMondayChange: (monday: string) => void;
  staff: readonly StaffListItem[];
  staffMemberId: string | undefined;
  onStaffChange: (staffMemberId: string | undefined) => void;
}) {
  const today = getTodayVnDate();
  const sunday = getSundayOfMonday(monday);
  const thisMonday = getMondayOfDate(today);
  const query = useOwnerWorkSchedules(monday, sunday, staffMemberId);

  const days = useMemo(() => {
    const byDate = new Map<string, WorkScheduleItem[]>();
    for (const shift of query.data ?? []) {
      const list = byDate.get(shift.date) ?? [];
      list.push(shift);
      byDate.set(shift.date, list);
    }
    return generateWeekDays(monday, today).map((day) => ({
      ...day,
      shifts: (byDate.get(day.dateStr) ?? []).sort(
        (a, b) => a.startTime.localeCompare(b.startTime) || a.staffName.localeCompare(b.staffName),
      ),
    }));
  }, [query.data, monday, today]);
  const activeCount = (query.data ?? []).filter((shift) => shift.status === 'active').length;

  return (
    <View style={styles.container}>
      <View style={styles.weekRow}>
        <Pressable
          onPress={() => onMondayChange(addDaysToDate(monday, -7))}
          accessibilityRole="button"
          accessibilityLabel="Tuần trước"
          style={styles.navButton}
        >
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => onMondayChange(thisMonday)}
          accessibilityRole="button"
          accessibilityLabel="Về tuần này"
          style={styles.weekLabel}
        >
          <AppText style={styles.weekText}>{formatWeekHeader(monday, sunday)}</AppText>
          <AppText style={styles.weekHint}>
            {monday === thisMonday ? 'Tuần này' : 'Chạm để về tuần này'}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onMondayChange(addDaysToDate(monday, 7))}
          accessibilityRole="button"
          accessibilityLabel="Tuần sau"
          style={styles.navButton}
        >
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsBar}
        contentContainerStyle={styles.chips}
      >
        {[{ id: undefined, fullName: 'Tất cả' }, ...staff].map((member) => {
          const active = member.id === staffMemberId;
          return (
            <Pressable
              key={member.id ?? 'all'}
              onPress={() => onStaffChange(member.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                {member.fullName}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {query.isLoading ? (
        <View style={styles.center}>
          <AppLoader />
        </View>
      ) : query.isError ? (
        <View style={styles.padded}>
          <ErrorState
            message="Không tải được lịch làm việc. Vui lòng thử lại."
            onRetry={() => void query.refetch()}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <AppText style={styles.count}>
            {activeCount} ca trong tuần · Chỉ xem, xếp và đổi ca trên trang quản trị web
          </AppText>
          {days.map((day) => (
            <View key={day.dateStr} style={[styles.day, day.isToday && styles.dayToday]}>
              <View style={styles.dayHeader}>
                <AppText style={styles.dayTitle}>
                  {day.fullDayLabel}, {String(day.dayNumber).padStart(2, '0')}/
                  {String(day.monthNumber).padStart(2, '0')}
                </AppText>
                {day.isToday ? <AppText style={styles.todayBadge}>Hôm nay</AppText> : null}
              </View>
              {day.shifts.length === 0 ? (
                <AppText style={styles.empty}>Không có ca</AppText>
              ) : (
                day.shifts.map((shift) => {
                  const cancelled = shift.status === 'cancelled';
                  return (
                    <View
                      key={shift.id}
                      style={styles.shift}
                      accessibilityLabel={`${shift.staffName}, ${formatLocalTime(shift.startTime)} đến ${formatLocalTime(shift.endTime)}${cancelled ? ', đã hủy' : ''}`}
                    >
                      <View style={styles.shiftTime}>
                        <Clock size={14} color={cancelled ? colors.muted : colors.primary} />
                        <AppText style={[styles.shiftTimeText, cancelled && styles.cancelled]}>
                          {formatLocalTime(shift.startTime)} – {formatLocalTime(shift.endTime)}
                        </AppText>
                      </View>
                      <AppText
                        style={[styles.shiftStaff, cancelled && styles.cancelled]}
                        numberOfLines={1}
                      >
                        {shift.staffName}
                      </AppText>
                      {cancelled ? <AppText style={styles.cancelledBadge}>Đã hủy</AppText> : null}
                    </View>
                  );
                })
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  weekText: { fontSize: 16, fontWeight: '700', color: colors.text },
  weekHint: { fontSize: 12, color: colors.muted },
  // A horizontal ScrollView in a flex column shrinks to nothing unless it keeps its own height.
  chipsBar: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.onPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  padded: { padding: spacing.md },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  count: { fontSize: 12, color: colors.muted },
  day: {
    backgroundColor: colors.card,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  dayToday: { borderColor: colors.primary },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  todayBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  empty: { fontSize: 13, color: colors.muted },
  shift: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shiftTime: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 118 },
  shiftTimeText: { fontSize: 13, fontWeight: '700', color: colors.text },
  shiftStaff: { flex: 1, fontSize: 13, color: colors.text },
  cancelled: { color: colors.muted, textDecorationLine: 'line-through' },
  cancelledBadge: { fontSize: 11, fontWeight: '600', color: colors.muted },
});
