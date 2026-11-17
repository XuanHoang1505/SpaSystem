import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Filter, RefreshCw } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import {
  getDatePresets,
  getVietnamToday,
  groupByOptions,
  productTypeOptions,
  validateDateRange,
  type DatePreset,
} from '../utils/reportHelpers';
import type { ReportProductType, RevenueGroupBy } from '@spa/shared-types';

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function RevenueFilterBar({
  fromDate,
  toDate,
  groupBy,
  productType,
  onDateRangeChange,
  onGroupByChange,
  onProductTypeChange,
  onReset,
}: {
  fromDate: string;
  toDate: string;
  groupBy: RevenueGroupBy;
  productType: ReportProductType;
  onDateRangeChange: (from: string, to: string) => void;
  onGroupByChange: (groupBy: RevenueGroupBy) => void;
  onProductTypeChange: (productType: ReportProductType) => void;
  onReset: () => void;
}) {
  const presets = getDatePresets();

  // Tìm preset tương ứng nếu có
  const activePreset = presets.find((p) => p.fromDate === fromDate && p.toDate === toDate);
  const isCustom = !activePreset;

  const [customMode, setCustomMode] = useState(isCustom);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const rangeError = validateDateRange(fromDate, toDate);

  const handleSelectPreset = (preset: DatePreset) => {
    setCustomMode(false);
    onDateRangeChange(preset.fromDate, preset.toDate);
  };

  const handleEnableCustom = () => {
    setCustomMode(true);
  };

  return (
    <View style={styles.container}>
      {/* 1. Header bộ lọc + nút đặt lại */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Filter size={16} color={colors.primary} />
          <AppText style={styles.title}>Bộ lọc báo cáo</AppText>
        </View>
        <Pressable
          style={styles.resetButton}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Đặt lại bộ lọc về mặc định"
        >
          <RefreshCw size={13} color={colors.muted} />
          <AppText style={styles.resetText}>Mặc định</AppText>
        </Pressable>
      </View>

      {/* 2. Dải chọn khoảng thời gian nhanh (Presets) */}
      <View style={styles.section}>
        <AppText style={styles.sectionLabel}>Khoảng thời gian</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {presets.map((preset) => {
            const isSelected = !customMode && activePreset?.id === preset.id;
            return (
              <Pressable
                key={preset.id}
                style={[styles.chip, isSelected && styles.activeChip]}
                onPress={() => handleSelectPreset(preset)}
                accessibilityRole="button"
                accessibilityLabel={`Chọn khoảng thời gian ${preset.label}`}
              >
                <AppText style={[styles.chipText, isSelected && styles.activeChipText]}>
                  {preset.label}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.chip, customMode && styles.activeChip]}
            onPress={handleEnableCustom}
            accessibilityRole="button"
            accessibilityLabel="Chọn khoảng thời gian tùy chỉnh"
          >
            <AppText style={[styles.chipText, customMode && styles.activeChipText]}>
              Tùy chỉnh
            </AppText>
          </Pressable>
        </ScrollView>
      </View>

      {/* 3. Ô chọn ngày tùy chỉnh (Hiện khi customMode = true) */}
      {customMode ? (
        <View style={styles.customDateBox}>
          <View style={styles.dateInputsRow}>
            {/* Từ ngày */}
            <View style={styles.dateField}>
              <AppText style={styles.dateInputLabel}>Từ ngày</AppText>
              <Pressable
                style={styles.dateButton}
                onPress={() => setShowFromPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Chọn từ ngày"
              >
                <Calendar size={14} color={colors.primary} />
                <AppText style={styles.dateButtonText}>{formatLocalDate(fromDate)}</AppText>
              </Pressable>
            </View>

            {/* Đến ngày */}
            <View style={styles.dateField}>
              <AppText style={styles.dateInputLabel}>Đến ngày</AppText>
              <Pressable
                style={styles.dateButton}
                onPress={() => setShowToPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Chọn đến ngày"
              >
                <Calendar size={14} color={colors.primary} />
                <AppText style={styles.dateButtonText}>{formatLocalDate(toDate)}</AppText>
              </Pressable>
            </View>
          </View>

          {/* Lỗi khoảng ngày */}
          {rangeError ? <AppText style={styles.errorText}>{rangeError}</AppText> : null}
        </View>
      ) : (
        /* Nhãn khoảng ngày hiện tại khi dùng Preset */
        <View style={styles.currentRangeWrap}>
          <Calendar size={13} color={colors.muted} />
          <AppText style={styles.currentRangeText}>
            {formatLocalDate(fromDate)} – {formatLocalDate(toDate)}
          </AppText>
        </View>
      )}

      {/* 4. Nhóm theo kỳ (Tháng / Quý / Năm) */}
      <View style={styles.section}>
        <AppText style={styles.sectionLabel}>Nhóm theo</AppText>
        <View style={styles.segmentedContainer}>
          {groupByOptions.map((opt) => {
            const isSelected = groupBy === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.segmentBtn, isSelected && styles.activeSegmentBtn]}
                onPress={() => onGroupByChange(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={`Nhóm theo ${opt.label}`}
              >
                <AppText style={[styles.segmentText, isSelected && styles.activeSegmentText]}>
                  {opt.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 5. Phân loại sản phẩm (Tất cả / Dịch vụ lẻ / Gói liệu trình) */}
      <View style={styles.section}>
        <AppText style={styles.sectionLabel}>Tiêu chí sản phẩm</AppText>
        <View style={styles.productTypeRow}>
          {productTypeOptions.map((opt) => {
            const isSelected = productType === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.productTypeChip, isSelected && styles.activeProductTypeChip]}
                onPress={() => onProductTypeChange(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={`Lọc theo ${opt.label}`}
              >
                <AppText
                  style={[
                    styles.productTypeText,
                    isSelected && styles.activeProductTypeText,
                  ]}
                >
                  {opt.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Date Pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={new Date(`${fromDate}T00:00:00`)}
          mode="date"
          maximumDate={new Date(`${getVietnamToday()}T23:59:59`)}
          onChange={(event, date) => {
            setShowFromPicker(false);
            if (event.type === 'set' && date) {
              onDateRangeChange(toIsoDate(date), toDate);
            }
          }}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={new Date(`${toDate}T00:00:00`)}
          mode="date"
          maximumDate={new Date(`${getVietnamToday()}T23:59:59`)}
          onChange={(event, date) => {
            setShowToPicker(false);
            if (event.type === 'set' && date) {
              onDateRangeChange(fromDate, toIsoDate(date));
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.neutralSoft,
  },
  resetText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  chipsScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  currentRangeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-start',
    borderRadius: 8,
  },
  currentRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  customDateBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
    gap: 4,
  },
  dateInputLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  activeSegmentBtn: {
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  activeSegmentText: {
    color: colors.primary,
    fontWeight: '700',
  },
  productTypeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  productTypeChip: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeProductTypeChip: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  productTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  activeProductTypeText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
