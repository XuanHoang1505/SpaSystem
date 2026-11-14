import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { AvailableStaff } from '@spa/shared-types';
import { Clock, Sparkles, Sunrise, Sunset, UserRound } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';
import {
  anyStaffTimes,
  getStaffAvailableAtTime,
  hideElapsedTimes,
  type PickedSlot,
} from '../utils/bookingHelpers';

export function StaffSlotPicker({
  staff,
  date,
  now,
  selected,
  onSelect,
  currentStaffId,
  primaryStaffId,
  fixedStaffId,
  emptyText,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: {
  staff: readonly AvailableStaff[];
  date: string;
  now: { date: string; time: string };
  selected: PickedSlot | null;
  onSelect: (slot: PickedSlot) => void;
  currentStaffId?: string;
  primaryStaffId?: string | null;
  fixedStaffId?: string;
  emptyText?: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
}) {
  const times = useMemo(
    () => hideElapsedTimes(anyStaffTimes(staff), date, now),
    [staff, date, now],
  );

  const chosen = selected && times.includes(selected.startTime) ? selected.startTime : null;

  const availableStaffForChosen = useMemo(
    () => (chosen ? getStaffAvailableAtTime(staff, chosen) : []),
    [staff, chosen],
  );

  const periods = useMemo(
    () =>
      [
        {
          label: 'Sáng',
          Icon: Sunrise,
          times: times.filter((t) => t < '12:00'),
        },
        {
          label: 'Chiều',
          Icon: Sunset,
          times: times.filter((t) => t >= '12:00'),
        },
      ].filter((period) => period.times.length > 0),
    [times],
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tìm khung giờ trống...</AppText>
        </View>
      ) : isError ? (
        <View style={styles.errorBox}>
          <AppNotice
            tone="error"
            message={errorMessage ?? 'Không thể tải danh sách khung giờ trống.'}
          />
          <AppButton title="Thử lại" variant="outline" onPress={onRetry} />
        </View>
      ) : times.length === 0 ? (
        <View style={styles.emptyBox}>
          <AppText style={styles.emptyTitle}>{emptyText ?? 'Ngày này đã kín lịch'}</AppText>
          <AppText style={styles.emptySub}>
            Vui lòng chọn một ngày khác trên thanh lịch phía trên.
          </AppText>
        </View>
      ) : (
        <View style={styles.contentWrap}>
          {/* 1. Time Selection grouped by Sáng & Chiều */}
          <View style={styles.timeGroup}>
            <View style={styles.groupHeaderRow}>
              <Clock size={16} color={colors.primary} />
              <AppText style={styles.groupTitle}>Chọn giờ</AppText>
            </View>

            {periods.map(({ label, Icon, times: periodTimes }) => (
              <View key={label} style={styles.periodSection}>
                <View style={styles.periodHeaderRow}>
                  <Icon size={15} color={colors.primary} />
                  <AppText style={styles.periodLabel}>{label.toUpperCase()}</AppText>
                </View>

                <View style={styles.timeGrid}>
                  {periodTimes.map((time) => {
                    const isSelected = chosen === time;
                    return (
                      <Pressable
                        key={time}
                        onPress={() =>
                          onSelect({
                            startTime: time,
                            ...(fixedStaffId ? { staffMemberId: fixedStaffId } : {}),
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Khung giờ ${time}`}
                        accessibilityState={{ selected: isSelected }}
                        style={[styles.timeButton, isSelected && styles.timeButtonSelected]}
                      >
                        <AppText
                          style={[
                            styles.timeButtonText,
                            isSelected && styles.timeButtonTextSelected,
                          ]}
                        >
                          {time}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* 2. Available Technicians at the chosen time */}
          {!fixedStaffId &&
            (chosen ? (
              <View style={styles.staffSection}>
                <View style={styles.groupHeaderRow}>
                  <UserRound size={16} color={colors.primary} />
                  <AppText style={styles.groupTitle}>{`Kỹ thuật viên rảnh lúc ${chosen}`}</AppText>
                </View>

                <View style={styles.staffChoicesWrap}>
                  {/* Any Technician Button */}
                  {(() => {
                    const isAnySelected = selected?.staffMemberId === undefined;
                    return (
                      <Pressable
                        onPress={() => onSelect({ startTime: chosen })}
                        accessibilityRole="button"
                        accessibilityLabel="Kỹ thuật viên bất kỳ"
                        accessibilityState={{ selected: isAnySelected }}
                        style={[
                          styles.staffChoiceBtn,
                          isAnySelected && styles.staffChoiceBtnSelected,
                        ]}
                      >
                        <Sparkles
                          size={15}
                          color={isAnySelected ? colors.onPrimary : colors.primary}
                        />
                        <AppText
                          style={[
                            styles.staffChoiceText,
                            isAnySelected && styles.staffChoiceTextSelected,
                          ]}
                        >
                          Kỹ thuật viên bất kỳ
                        </AppText>
                      </Pressable>
                    );
                  })()}

                  {/* Specific Technicians Free at Chosen Time */}
                  {availableStaffForChosen.map((member) => {
                    const isSelected = selected?.staffMemberId === member.id;
                    const isCurrent = member.id === currentStaffId;
                    const isPrimary = member.id === primaryStaffId;

                    return (
                      <View key={member.id} style={styles.staffChoiceCol}>
                        <Pressable
                          onPress={() =>
                            onSelect({
                              startTime: chosen,
                              staffMemberId: member.id,
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Kỹ thuật viên ${member.fullName}`}
                          accessibilityState={{ selected: isSelected }}
                          style={[
                            styles.staffChoiceBtn,
                            isSelected && styles.staffChoiceBtnSelected,
                          ]}
                        >
                          <UserRound
                            size={15}
                            color={isSelected ? colors.onPrimary : colors.primary}
                          />
                          <AppText
                            style={[
                              styles.staffChoiceText,
                              isSelected && styles.staffChoiceTextSelected,
                            ]}
                          >
                            {member.fullName}
                          </AppText>
                          {isPrimary && (
                            <View
                              style={[
                                styles.primaryBadge,
                                isSelected && styles.primaryBadgeSelected,
                              ]}
                            >
                              <AppText
                                style={[
                                  styles.primaryBadgeText,
                                  isSelected && styles.primaryBadgeTextSelected,
                                ]}
                              >
                                Phụ trách
                              </AppText>
                            </View>
                          )}
                        </Pressable>

                        {isCurrent && (
                          <AppText style={styles.currentStaffCaption}>
                            Đang là kỹ thuật viên của lịch này
                          </AppText>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.promptBox}>
                <AppText style={styles.promptText}>
                  Vui lòng chọn một khung giờ phía trên để xem các kỹ thuật viên sẵn sàng phục vụ.
                </AppText>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  contentWrap: {
    gap: spacing.md,
  },
  centerBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
  },
  errorBox: {
    gap: spacing.sm,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
  timeGroup: {
    gap: spacing.sm,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  periodSection: {
    gap: spacing.xs,
  },
  periodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeButton: {
    minWidth: '22%',
    flexGrow: 1,
    maxWidth: '24%',
    minHeight: 44,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  timeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  timeButtonTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  staffSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  staffChoicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  staffChoiceCol: {
    alignItems: 'flex-start',
    gap: 3,
  },
  staffChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  staffChoiceBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  staffChoiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  staffChoiceTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  primaryBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  primaryBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  primaryBadgeTextSelected: {
    color: colors.onPrimary,
  },
  currentStaffCaption: {
    fontSize: 11,
    color: colors.muted,
    paddingHorizontal: 2,
  },
  promptBox: {
    borderRadius: radius.small,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
  },
  promptText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
