import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import { ChevronLeft, ChevronRight, LayoutGrid, Clock3, RotateCcw } from 'lucide-react-native';

export type ScheduleViewMode = 'matrix' | 'timeline';

interface Props {
  weekRangeLabel: string;
  monthYearLabel?: string;
  isCurrentWeek: boolean;
  viewMode: ScheduleViewMode;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onToggleViewMode: (mode: ScheduleViewMode) => void;
}

export function WeekHeaderNav({
  weekRangeLabel,
  monthYearLabel = 'Lịch theo tuần',
  isCurrentWeek,
  viewMode,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onToggleViewMode,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Row 1: Month/Year title & View mode segmented control */}
      <View style={styles.topRow}>
        <AppText style={styles.monthTitle}>{monthYearLabel}</AppText>

        <View style={styles.toggleGroup} accessibilityRole="tablist">
          <Pressable
            onPress={() => onToggleViewMode('matrix')}
            style={[styles.toggleBtn, viewMode === 'matrix' && styles.toggleBtnActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'matrix' }}
            accessibilityLabel="Chế độ xem lưới tuần"
          >
            <LayoutGrid
              size={14}
              color={viewMode === 'matrix' ? colors.primaryPressed : colors.tabBarInactive}
            />
            <AppText
              style={[styles.toggleBtnText, viewMode === 'matrix' && styles.toggleBtnTextActive]}
            >
              Lưới
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => onToggleViewMode('timeline')}
            style={[styles.toggleBtn, viewMode === 'timeline' && styles.toggleBtnActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'timeline' }}
            accessibilityLabel="Chế độ xem dòng thời gian giờ"
          >
            <Clock3
              size={14}
              color={viewMode === 'timeline' ? colors.primaryPressed : colors.tabBarInactive}
            />
            <AppText
              style={[styles.toggleBtnText, viewMode === 'timeline' && styles.toggleBtnTextActive]}
            >
              Giờ
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Row 2: Unified Week Switcher Bar */}
      <View style={styles.navRow}>
        <Pressable
          onPress={onPrevWeek}
          style={({ pressed }) => [styles.chevronBtn, pressed && styles.chevronBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Xem tuần trước"
          hitSlop={8}
        >
          <ChevronLeft size={18} color={colors.text} />
          <AppText style={styles.srOnly}>Tuần trước</AppText>
        </Pressable>

        <Pressable
          onPress={isCurrentWeek ? undefined : onCurrentWeek}
          style={styles.weekCenterBtn}
          accessibilityRole="button"
          accessibilityLabel={
            isCurrentWeek
              ? `Tuần này, khoảng ngày ${weekRangeLabel}`
              : `Bấm để quay về tuần này, khoảng ngày hiện tại ${weekRangeLabel}`
          }
        >
          <AppText style={styles.weekRangeText}>{weekRangeLabel}</AppText>
          {isCurrentWeek ? (
            <View style={styles.currentBadge}>
              <View style={styles.currentDot} />
              <AppText style={styles.currentBadgeText}>Tuần này</AppText>
            </View>
          ) : (
            <View style={styles.returnBadge}>
              <RotateCcw size={10} color={colors.primary} />
              <AppText style={styles.returnBadgeText}>Về tuần này</AppText>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={onNextWeek}
          style={({ pressed }) => [styles.chevronBtn, pressed && styles.chevronBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Xem tuần sau"
          hitSlop={8}
        >
          <ChevronRight size={18} color={colors.text} />
          <AppText style={styles.srOnly}>Tuần sau</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 28,
  },
  toggleBtnActive: {
    backgroundColor: colors.primarySoft,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tabBarInactive,
  },
  toggleBtnTextActive: {
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chevronBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBtnPressed: {
    backgroundColor: colors.primarySoft,
  },
  weekCenterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  weekRangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  returnBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
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
