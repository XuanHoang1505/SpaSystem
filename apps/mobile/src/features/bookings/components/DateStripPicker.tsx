import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { buildBookingDateRange } from '../utils/bookingHelpers';

const DAYS_PER_PAGE = 7;

export function DateStripPicker({
  todayVn,
  selectedDate,
  earliestDate,
  onSelectDate,
}: {
  todayVn: string;
  selectedDate: string;
  earliestDate?: string | null;
  onSelectDate: (date: string) => void;
}) {
  const allDates = useMemo(
    () => buildBookingDateRange(todayVn, earliestDate),
    [todayVn, earliestDate],
  );

  const initialPageIndex = useMemo(() => {
    const idx = allDates.findIndex((item) => item.date === selectedDate);
    return idx >= 0 ? Math.floor(idx / DAYS_PER_PAGE) : 0;
  }, [allDates, selectedDate]);

  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const maxPageIndex = Math.max(0, Math.ceil(allDates.length / DAYS_PER_PAGE) - 1);
  const clampedPage = Math.min(pageIndex, maxPageIndex);

  const visibleDates = allDates.slice(
    clampedPage * DAYS_PER_PAGE,
    (clampedPage + 1) * DAYS_PER_PAGE,
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Calendar size={16} color={colors.primary} />
          <AppText style={styles.sectionTitle}>1. Chọn ngày hẹn</AppText>
        </View>
        <View style={styles.navButtons}>
          <Pressable
            onPress={() => setPageIndex((prev) => Math.max(0, prev - 1))}
            disabled={clampedPage === 0}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Tuần trước"
            accessibilityState={{ disabled: clampedPage === 0 }}
            style={[styles.navBtn, clampedPage === 0 && styles.navBtnDisabled]}
          >
            <ChevronLeft size={18} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setPageIndex((prev) => Math.min(maxPageIndex, prev + 1))}
            disabled={clampedPage >= maxPageIndex}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Tuần tiếp theo"
            accessibilityState={{ disabled: clampedPage >= maxPageIndex }}
            style={[styles.navBtn, clampedPage >= maxPageIndex && styles.navBtnDisabled]}
          >
            <ChevronRight size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {earliestDate && earliestDate > todayVn && (
        <AppText style={styles.earliestHint}>
          Theo quy định khoảng cách giữa các buổi, ngày đặt sớm nhất là{' '}
          {formatLocalDate(earliestDate)}.
        </AppText>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripContent}
      >
        {visibleDates.map((item) => {
          const isSelected = item.date === selectedDate;
          return (
            <Pressable
              key={item.date}
              disabled={item.disabled}
              onPress={() => onSelectDate(item.date)}
              accessibilityRole="button"
              accessibilityLabel={`Ngày ${item.dayMonthLabel}, ${item.dayOfWeekLabel}${item.isToday ? ', hôm nay' : ''}`}
              accessibilityState={{ selected: isSelected, disabled: item.disabled }}
              style={[
                styles.datePill,
                isSelected && styles.datePillSelected,
                item.disabled && styles.datePillDisabled,
              ]}
            >
              <AppText
                style={[
                  styles.dowText,
                  isSelected && styles.textSelected,
                  item.disabled && styles.textDisabled,
                ]}
              >
                {item.isToday ? 'H.nay' : item.dayOfWeekLabel}
              </AppText>
              <AppText
                style={[
                  styles.dayNumberText,
                  isSelected && styles.textSelected,
                  item.disabled && styles.textDisabled,
                ]}
              >
                {item.dayNumber}
              </AppText>
              <AppText
                style={[
                  styles.monthText,
                  isSelected && styles.textSelected,
                  item.disabled && styles.textDisabled,
                ]}
              >
                Thg {item.monthNumber}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  earliestHint: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.small,
  },
  stripContent: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  datePill: {
    minWidth: 56,
    minHeight: 72,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 2,
  },
  datePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  datePillDisabled: {
    opacity: 0.38,
    backgroundColor: colors.surface,
  },
  dowText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  dayNumberText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  monthText: {
    fontSize: 10,
    color: colors.muted,
  },
  textSelected: {
    color: colors.onPrimary,
  },
  textDisabled: {
    color: colors.muted,
  },
});
