import { useState, useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppLoader } from '@components/common/AppLoader';
import { ErrorState } from '@components/common/ErrorState';
import { EmptyState } from '@components/common/EmptyState';
import { colors } from '@/theme/colors';
import { getTodayVnDate, addDaysToDate } from '@/features/bookings/utils/bookingHelpers';
import {
  getMondayOfDate,
  getSundayOfMonday,
  generateWeekDays,
  formatWeekHeader,
  formatMonthYearHeader,
} from '../utils/scheduleHelpers';
import { useMyWorkSchedules } from '../hooks/useMyWorkSchedules';
import { WeekHeaderNav, type ScheduleViewMode } from '../components/schedule/WeekHeaderNav';
import { WeeklyShiftMatrix } from '../components/schedule/WeeklyShiftMatrix';
import { ShiftAppointmentsPanel } from '../components/schedule/ShiftAppointmentsPanel';
import { DayTimelineView } from '../components/schedule/DayTimelineView';
import { CalendarOff } from 'lucide-react-native';

export function StaffScheduleScreen() {
  const insets = useSafeAreaInsets();
  const todayVn = useMemo(() => getTodayVnDate(), []);
  const initialMonday = useMemo(() => getMondayOfDate(todayVn), [todayVn]);

  const [currentMonday, setCurrentMonday] = useState(initialMonday);
  const [selectedDate, setSelectedDate] = useState(todayVn);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('matrix');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const currentSunday = useMemo(() => getSundayOfMonday(currentMonday), [currentMonday]);
  const isCurrentWeek = currentMonday === initialMonday;
  const weekRangeLabel = useMemo(
    () => formatWeekHeader(currentMonday, currentSunday),
    [currentMonday, currentSunday],
  );
  const monthYearLabel = useMemo(
    () => formatMonthYearHeader(currentMonday),
    [currentMonday],
  );

  const weekDays = useMemo(
    () => generateWeekDays(currentMonday, todayVn),
    [currentMonday, todayVn],
  );

  const {
    data: shifts = [],
    isLoading,
    isError,
    refetch,
  } = useMyWorkSchedules({
    fromDate: currentMonday,
    toDate: currentSunday,
  });

  // Automatically select a relevant shift when shifts data changes
  useEffect(() => {
    if (shifts.length === 0) {
      setSelectedShiftId(null);
      return;
    }
    // Prefer today's shift if present in current week
    const todayShift = shifts.find((s) => s.date === todayVn && s.status !== 'cancelled');
    if (todayShift) {
      setSelectedShiftId(todayShift.id);
      return;
    }
    // Else prefer selectedDate shift
    const dateShift = shifts.find((s) => s.date === selectedDate && s.status !== 'cancelled');
    if (dateShift) {
      setSelectedShiftId(dateShift.id);
      return;
    }
    // Fallback to first active shift or first shift
    const firstActive = shifts.find((s) => s.status !== 'cancelled') ?? shifts[0];
    if (firstActive) {
      setSelectedShiftId(firstActive.id);
    }
  }, [shifts, currentMonday, todayVn, selectedDate]);

  const handlePrevWeek = () => {
    const prevMon = addDaysToDate(currentMonday, -7);
    setCurrentMonday(prevMon);
    setSelectedDate(prevMon);
  };

  const handleNextWeek = () => {
    const nextMon = addDaysToDate(currentMonday, 7);
    setCurrentMonday(nextMon);
    setSelectedDate(nextMon);
  };

  const handleCurrentWeek = () => {
    setCurrentMonday(initialMonday);
    setSelectedDate(todayVn);
  };

  const handleSelectShift = (shift: (typeof shifts)[number]) => {
    setSelectedShiftId(shift.id);
    setSelectedDate(shift.date);
  };

  const handlePressAppointment = (appointmentId: string) => {
    router.push(`/(staff)/bookings/${appointmentId}`);
  };

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>
        <AppText accessibilityRole="header" style={styles.headerTitle}>
          Lịch làm việc
        </AppText>
        <AppText style={styles.headerSubtitle}>
          Theo dõi ca làm và lịch hẹn phục vụ trong tuần
        </AppText>
      </View>

      {/* Week Navigation & View Mode Switcher */}
      <WeekHeaderNav
        monthYearLabel={monthYearLabel}
        weekRangeLabel={weekRangeLabel}
        isCurrentWeek={isCurrentWeek}
        viewMode={viewMode}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
        onToggleViewMode={setViewMode}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.centeredWrap}>
          <AppLoader />
          <AppText style={styles.loadingText}>Đang tải lịch làm việc...</AppText>
        </View>
      ) : isError ? (
        <View style={styles.centeredWrap}>
          <ErrorState
            message="Không thể kết nối đến máy chủ để lấy lịch ca làm. Vui lòng thử lại."
            onRetry={() => refetch()}
          />
        </View>
      ) : shifts.length === 0 ? (
        <View style={styles.centeredWrap}>
          <EmptyState
            icon={CalendarOff}
            title="Tuần này không có ca"
            description="Spa chưa xếp ca làm việc nào cho bạn trong tuần này. Hãy liên hệ quản lý nếu có thay đổi."
          />
        </View>
      ) : viewMode === 'matrix' ? (
        <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
          {/* Weekly Interactive Matrix */}
          <WeeklyShiftMatrix
            weekDays={weekDays}
            shifts={shifts}
            selectedShiftId={selectedShiftId}
            onSelectShift={handleSelectShift}
          />

          {/* Selected Shift's Appointments Panel */}
          {selectedShiftId ? (
            <ShiftAppointmentsPanel
              selectedShiftId={selectedShiftId}
              onPressAppointment={handlePressAppointment}
            />
          ) : (
            <View style={styles.promptWrap}>
              <AppText style={styles.promptText}>
                Chạm vào một ca làm việc ở trên để xem danh sách lịch hẹn.
              </AppText>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
          <DayTimelineView
            weekDays={weekDays}
            shifts={shifts}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPressAppointment={handlePressAppointment}
          />
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  bodyScroll: {
    flex: 1,
  },
  centeredWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
  },
  promptWrap: {
    padding: 32,
    alignItems: 'center',
  },
  promptText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
