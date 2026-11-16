import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import type { MyWorkSchedule } from '@spa/shared-types';
import { type WeekDayInfo, isCurrentlyInShift } from '../../utils/scheduleHelpers';
import { Clock, Users, Coffee, Sparkles } from 'lucide-react-native';

interface Props {
  weekDays: readonly WeekDayInfo[];
  shifts: readonly MyWorkSchedule[];
  selectedShiftId: string | null;
  onSelectShift: (shift: MyWorkSchedule) => void;
}

export function WeeklyShiftMatrix({
  weekDays,
  shifts,
  selectedShiftId,
  onSelectShift,
}: Props) {
  // Group shifts by date string (YYYY-MM-DD)
  const shiftsByDate = new Map<string, MyWorkSchedule[]>();
  for (const shift of shifts) {
    const list = shiftsByDate.get(shift.date) ?? [];
    list.push(shift);
    shiftsByDate.set(shift.date, list);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {weekDays.map((day) => {
          const dayShifts = shiftsByDate.get(day.dateStr) ?? [];
          const hasShifts = dayShifts.length > 0;

          return (
            <View
              key={day.dateStr}
              style={[
                styles.dayColumn,
                day.isToday && styles.todayColumn,
              ]}
            >
              {/* Day Header */}
              <View style={[styles.dayHeader, day.isToday && styles.todayHeader]}>
                <AppText style={[styles.dayName, day.isToday && styles.todayText]}>
                  {day.dayLabel}
                </AppText>
                <AppText style={[styles.dayNum, day.isToday && styles.todayNum]}>
                  {day.dayNumber}
                </AppText>
                {day.isToday ? (
                  <View style={styles.todayDot} />
                ) : null}
              </View>

              {/* Day Shifts or Off indicator */}
              <View style={styles.shiftsContainer}>
                {hasShifts ? (
                  dayShifts.map((shift) => {
                    const isSelected = selectedShiftId === shift.id;
                    const isCancelled = shift.status === 'cancelled';
                    const isLive = !isCancelled && isCurrentlyInShift(shift.date, shift.startTime, shift.endTime);

                    return (
                      <Pressable
                        key={shift.id}
                        onPress={() => onSelectShift(shift)}
                        style={[
                          styles.shiftCard,
                          isSelected && styles.shiftCardSelected,
                          isCancelled && styles.shiftCardCancelled,
                          isLive && styles.shiftCardLive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Ca ${shift.startTime} đến ${shift.endTime}, ngày ${day.dayLabel} ${day.dayNumber}`}
                      >
                        {isLive ? (
                          <View style={styles.liveBadge}>
                            <Sparkles size={10} color={colors.onPrimary} />
                            <AppText style={styles.liveBadgeText}>Đang ca</AppText>
                          </View>
                        ) : null}

                        {/* Semantic full text for accessibility */}
                        <AppText style={styles.srOnly}>
                          {shift.startTime} – {shift.endTime}
                        </AppText>

                        {/* Visual 2-line layout that never truncates */}
                        <View style={styles.shiftTimeCol}>
                          <View style={styles.shiftTimeRow}>
                            <Clock size={11} color={isCancelled ? colors.muted : colors.primaryPressed} />
                            <AppText
                              style={[
                                styles.shiftTimeText,
                                isCancelled && styles.shiftTimeCancelled,
                              ]}
                            >
                              {shift.startTime}
                            </AppText>
                          </View>

                          <AppText style={styles.shiftTimeArrow}>↓</AppText>

                          <AppText
                            style={[
                              styles.shiftTimeText,
                              styles.shiftTimeEnd,
                              isCancelled && styles.shiftTimeCancelled,
                            ]}
                          >
                            {shift.endTime}
                          </AppText>
                        </View>

                        {isCancelled ? (
                          <View style={styles.cancelledTag}>
                            <AppText style={styles.cancelledTagText}>Đã hủy</AppText>
                          </View>
                        ) : (
                          <View style={styles.appointmentChip}>
                            <Users size={11} color={colors.primary} />
                            <AppText style={styles.appointmentChipText}>
                              {shift.appointmentCount > 0 ? `${shift.appointmentCount} hẹn` : '0 hẹn'}
                            </AppText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.dayOffBox}>
                    <Coffee size={14} color={colors.tabBarInactive} />
                    <AppText style={styles.dayOffText}>Nghỉ</AppText>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  dayColumn: {
    width: 106,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 164,
  },
  todayColumn: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  dayHeader: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  todayHeader: {
    backgroundColor: colors.primarySoft,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  todayText: {
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  todayNum: {
    color: colors.primaryPressed,
    fontWeight: '800',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  shiftsContainer: {
    padding: 6,
    gap: 6,
    flex: 1,
  },
  shiftCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    gap: 5,
    alignItems: 'center',
  },
  shiftCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  shiftCardCancelled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    opacity: 0.65,
  },
  shiftCardLive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'center',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  shiftTimeCol: {
    alignItems: 'center',
    gap: 1,
    paddingVertical: 2,
    width: '100%',
  },
  shiftTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shiftTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  shiftTimeArrow: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 12,
  },
  shiftTimeEnd: {
    paddingLeft: 12, // align visually with startTime which has clock icon
  },
  shiftTimeCancelled: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  cancelledTag: {
    backgroundColor: colors.errorSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'center',
  },
  cancelledTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.error,
  },
  appointmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'center',
  },
  appointmentChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  dayOffBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  dayOffText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.tabBarInactive,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    opacity: 0,
  },
});
