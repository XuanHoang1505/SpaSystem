import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { AssignedAppointmentStatus } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import { assignedTabs, assignedTabLabels, type AssignedTab } from '../utils/careHelpers';

interface Props {
  activeTab: AssignedTab;
  onSelectTab: (tab: AssignedTab) => void;
  statusFilter: AssignedAppointmentStatus | undefined;
  onSelectStatus: (status: AssignedAppointmentStatus | undefined) => void;
  isCustomFiltered: boolean;
  onResetFilters: () => void;
}

const statusOptions: { value: AssignedAppointmentStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'pending_confirmation', label: 'Chờ xác nhận' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'no_show', label: 'Không đến' },
];

export function AssignedFiltersBar({
  activeTab,
  onSelectTab,
  statusFilter,
  onSelectStatus,
  isCustomFiltered,
  onResetFilters,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Preset Time Tabs */}
      <View style={styles.tabBar}>
        {assignedTabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => onSelectTab(tab)}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Tab ${assignedTabLabels[tab]}`}
            >
              <AppText style={[styles.tabText, isActive && styles.activeTabText]}>
                {assignedTabLabels[tab]}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Status Chips */}
      <View style={styles.statusRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusScrollContent}
        >
          {statusOptions.map((opt) => {
            const isSelected = opt.value === statusFilter;
            return (
              <Pressable
                key={opt.label}
                onPress={() => onSelectStatus(opt.value)}
                style={[styles.chip, isSelected && styles.activeChip]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Lọc trạng thái ${opt.label}`}
              >
                <AppText style={[styles.chipText, isSelected && styles.activeChipText]}>
                  {opt.label}
                </AppText>
              </Pressable>
            );
          })}

          {isCustomFiltered ? (
            <Pressable
              onPress={onResetFilters}
              style={styles.resetButton}
              accessibilityRole="button"
              accessibilityLabel="Xóa bộ lọc tùy chỉnh"
            >
              <AppText style={styles.resetButtonText}>Xóa lọc</AppText>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minHeight: 44,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  activeTabText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  statusRow: {
    paddingLeft: 16,
  },
  statusScrollContent: {
    gap: 8,
    paddingRight: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  activeChip: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  activeChipText: {
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    justifyContent: 'center',
    minHeight: 36,
  },
  resetButtonText: {
    fontSize: 13,
    color: colors.accentRose,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
