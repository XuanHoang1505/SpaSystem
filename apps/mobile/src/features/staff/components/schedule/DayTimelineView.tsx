import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import { AppCard } from '@components/common/AppCard';
import { EmptyState } from '@components/common/EmptyState';
import { AppLoader } from '@components/common/AppLoader';
import { colors } from '@/theme/colors';
import type { MyWorkSchedule, ShiftAppointment } from '@spa/shared-types';
import { type WeekDayInfo, formatFullVnDate } from '../../utils/scheduleHelpers';
import { useMyWorkScheduleDetail } from '../../hooks/useMyWorkScheduleDetail';
import { Clock, Coffee, Sparkles, User, ChevronRight } from 'lucide-react-native';

interface Props {
  weekDays: readonly WeekDayInfo[];
  shifts: readonly MyWorkSchedule[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onPressAppointment: (appointmentId: string) => void;
}

export function DayTimelineView({
  weekDays,
  shifts,
  selectedDate,
  onSelectDate,
  onPressAppointment,
}: Props) {
  // Find shifts for the currently selected date
  const dayShifts = shifts.filter((s) => s.date === selectedDate);
  const [selectedShiftIndex, setSelectedShiftIndex] = useState(0);

  const activeShift = dayShifts[selectedShiftIndex] ?? dayShifts[0];
  const { data: shiftDetail, isLoading: isLoadingDetail } = useMyWorkScheduleDetail(
    activeShift ? activeShift.id : null,
  );

  return (
    <View style={styles.container}>
      {/* Horizontal Day Selector Strip */}
      <View style={styles.dayStripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStripContent}
        >
          {weekDays.map((day) => {
            const hasShift = shifts.some((s) => s.date === day.dateStr && s.status !== 'cancelled');
            const isSelected = selectedDate === day.dateStr;

            return (
              <Pressable
                key={day.dateStr}
                onPress={() => {
                  onSelectDate(day.dateStr);
                  setSelectedShiftIndex(0);
                }}
                style={[
                  styles.dayStripItem,
                  isSelected && styles.dayStripItemSelected,
                  day.isToday && !isSelected && styles.dayStripItemToday,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${day.fullDayLabel}, ngày ${day.dayNumber}`}
              >
                <AppText
                  style={[
                    styles.dayStripLabel,
                    isSelected && styles.dayStripTextSelected,
                    day.isToday && !isSelected && styles.dayStripTextToday,
                  ]}
                >
                  {day.dayLabel}
                </AppText>
                <AppText
                  style={[
                    styles.dayStripNumber,
                    isSelected && styles.dayStripTextSelected,
                    day.isToday && !isSelected && styles.dayStripTextToday,
                  ]}
                >
                  {day.dayNumber}
                </AppText>
                {hasShift ? (
                  <View
                    style={[
                      styles.dayShiftDot,
                      isSelected && styles.dayShiftDotSelected,
                    ]}
                  />
                ) : (
                  <View style={styles.dayShiftDotEmpty} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Day Content */}
      <View style={styles.dayContent}>
        {dayShifts.length === 0 ? (
          <EmptyState
            icon={Coffee}
            title="Ngày nghỉ (Day Off)"
            description="Bạn không có ca làm việc nào được phân công trong ngày này. Chúc bạn có một ngày nghỉ ngơi vui vẻ!"
          />
        ) : (
          <View style={styles.timelineBody}>
            {/* Shifts Switcher if multiple shifts on same day */}
            {dayShifts.length > 1 ? (
              <View style={styles.shiftPillsRow}>
                {dayShifts.map((s, idx) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedShiftIndex(idx)}
                    style={[
                      styles.shiftPill,
                      selectedShiftIndex === idx && styles.shiftPillActive,
                    ]}
                  >
                    <Clock size={12} color={selectedShiftIndex === idx ? colors.onPrimary : colors.primary} />
                    <AppText
                      style={[
                        styles.shiftPillText,
                        selectedShiftIndex === idx && styles.shiftPillTextActive,
                      ]}
                    >
                      Ca {s.startTime} – {s.endTime}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Active Shift Header Card */}
            {activeShift ? (
              <View style={styles.shiftHeaderCard}>
                <View style={styles.shiftHeaderLeft}>
                  <AppText style={styles.shiftHeaderDate}>{formatFullVnDate(selectedDate)}</AppText>
                  <View style={styles.shiftTimeBadge}>
                    <Clock size={13} color={colors.primaryPressed} />
                    <AppText style={styles.shiftTimeBadgeText}>
                      Khung ca: {activeShift.startTime} – {activeShift.endTime}
                    </AppText>
                  </View>
                </View>
                <View style={styles.shiftHeaderRight}>
                  <AppText style={styles.shiftAptCount}>
                    {activeShift.appointmentCount} khách hẹn
                  </AppText>
                </View>
              </View>
            ) : null}

            {/* Timeline Stream */}
            {isLoadingDetail ? (
              <View style={styles.loadingWrap}>
                <AppLoader />
                <AppText style={styles.loadingText}>Đang tải lịch hẹn...</AppText>
              </View>
            ) : activeShift ? (
              <TimelineStream
                appointments={shiftDetail?.appointments ?? []}
                shiftStartTime={activeShift.startTime}
                shiftEndTime={activeShift.endTime}
                onPressAppointment={onPressAppointment}
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

function TimelineStream({
  appointments,
  shiftStartTime,
  shiftEndTime,
  onPressAppointment,
}: {
  appointments: readonly ShiftAppointment[];
  shiftStartTime: string;
  shiftEndTime: string;
  onPressAppointment: (id: string) => void;
}) {
  if (appointments.length === 0) {
    return (
      <View style={styles.emptyAppointments}>
        <AppText style={styles.emptyAppointmentsText}>
          Ca làm việc {shiftStartTime} – {shiftEndTime} chưa có lịch hẹn nào.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.timelineList}>
      {appointments.map((apt, index) => {
        const isFirst = index === 0;
        const isLast = index === appointments.length - 1;

        return (
          <View key={apt.id} style={styles.timelineRow}>
            {/* Timeline Axis */}
            <View style={styles.axisContainer}>
              <View style={[styles.axisLine, isFirst && styles.axisLineFirst]} />
              <View style={styles.axisDot}>
                <View style={styles.axisDotInner} />
              </View>
              <View style={[styles.axisLine, isLast && styles.axisLineLast]} />
            </View>

            {/* Timeline Item Card */}
            <Pressable
              style={({ pressed }) => [
                styles.appointmentCard,
                pressed && styles.appointmentCardPressed,
              ]}
              onPress={() => onPressAppointment(apt.id)}
              accessibilityRole="button"
              accessibilityLabel={`Hẹn ${apt.service.name} cho khách ${apt.customer.fullName}`}
            >
              <View style={styles.aptHeader}>
                <View style={styles.aptTime}>
                  <Clock size={12} color={colors.primaryPressed} />
                  <AppText style={styles.aptTimeText}>
                    {apt.startTime} – {apt.endTime}
                  </AppText>
                </View>
                <ChevronRight size={16} color={colors.muted} />
              </View>

              <AppText style={styles.aptServiceName}>{apt.service.name}</AppText>

              {apt.treatmentSession ? (
                <View style={styles.aptSessionRow}>
                  <Sparkles size={11} color={colors.primary} />
                  <AppText style={styles.aptSessionText}>
                    Buổi {apt.treatmentSession.sequenceNumber}/{apt.treatmentSession.totalSessions} · {apt.treatmentSession.packageName}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.aptCustomerRow}>
                <User size={13} color={colors.muted} />
                <AppText style={styles.aptCustomerName}>{apt.customer.fullName}</AppText>
                {apt.customer.phoneNumber ? (
                  <AppText style={styles.aptCustomerPhone}>({apt.customer.phoneNumber})</AppText>
                ) : null}
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayStripContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayStripContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayStripItem: {
    width: 48,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
  },
  dayStripItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayStripItemToday: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  dayStripLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  dayStripNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginVertical: 2,
  },
  dayStripTextSelected: {
    color: colors.onPrimary,
  },
  dayStripTextToday: {
    color: colors.primaryPressed,
  },
  dayShiftDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  dayShiftDotSelected: {
    backgroundColor: colors.onPrimary,
  },
  dayShiftDotEmpty: {
    width: 4,
    height: 4,
  },
  dayContent: {
    flex: 1,
    padding: 16,
  },
  timelineBody: {
    gap: 14,
  },
  shiftPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  shiftPillActive: {
    backgroundColor: colors.primary,
  },
  shiftPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  shiftPillTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  shiftHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftHeaderLeft: {
    gap: 4,
  },
  shiftHeaderDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  shiftTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shiftTimeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryPressed,
  },
  shiftHeaderRight: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  shiftAptCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  loadingWrap: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
  },
  emptyAppointments: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyAppointmentsText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
  timelineList: {
    gap: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  axisContainer: {
    width: 24,
    alignItems: 'center',
  },
  axisLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
  },
  axisLineFirst: {
    backgroundColor: 'transparent',
  },
  axisLineLast: {
    backgroundColor: 'transparent',
  },
  axisDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  axisDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  appointmentCard: {
    flex: 1,
    padding: 12,
    gap: 6,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appointmentCardPressed: {
    opacity: 0.85,
    backgroundColor: colors.background,
  },
  aptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aptTime: {
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
  aptServiceName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  aptSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aptSessionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryPressed,
  },
  aptCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  aptCustomerName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  aptCustomerPhone: {
    fontSize: 11,
    color: colors.muted,
  },
});
