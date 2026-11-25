import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { AppointmentListItem, AppointmentStatus } from '@spa/shared-types';
import { ChevronLeft, ChevronRight, Clock, Search, UserRound } from 'lucide-react-native';
import { AppInput } from '@components/common/AppInput';
import { AppLoader } from '@components/common/AppLoader';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { EmptyState } from '@components/common/EmptyState';
import { ErrorState } from '@components/common/ErrorState';
import { formatLocalTime } from '@/lib/formatting/formatters';
import { formatFullVnDate } from '@features/staff/utils/scheduleHelpers';
import { colors, radius, spacing } from '@theme/index';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';
import { OwnerAppointmentSheet } from '../components/OwnerAppointmentSheet';
import { useOwnerAppointments } from '../hooks/useOwnerAppointments';
import { addDaysToDate, getTodayVnDate } from '../utils/bookingHelpers';

const statusFilters: readonly { value: AppointmentStatus | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'pending_confirmation', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'no_show', label: 'Không đến' },
  { value: 'cancelled', label: 'Đã hủy' },
];

/** SCR-M (owner) — every appointment of the spa, one day at a time (UC-SPA-17). */
export function OwnerAppointmentsScreen() {
  const today = getTodayVnDate();
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<AppointmentStatus | undefined>();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search on the server once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const query = useOwnerAppointments({
    fromDate: date,
    toDate: date,
    status,
    search: search || undefined,
    pageNumber: 1,
    pageSize: 100,
  });
  const items = query.data?.items ?? [];

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => setDate((value) => addDaysToDate(value, -1))}
            accessibilityRole="button"
            accessibilityLabel="Ngày trước"
            style={styles.navButton}
          >
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setDate(today)}
            accessibilityRole="button"
            accessibilityLabel="Về hôm nay"
            style={styles.dateLabel}
          >
            <AppText style={styles.dateText}>{formatFullVnDate(date)}</AppText>
            <AppText style={styles.dateHint}>
              {date === today ? 'Hôm nay' : 'Chạm để về hôm nay'}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setDate((value) => addDaysToDate(value, 1))}
            accessibilityRole="button"
            accessibilityLabel="Ngày sau"
            style={styles.navButton}
          >
            <ChevronRight size={20} color={colors.text} />
          </Pressable>
        </View>

        <AppInput
          label="Tìm khách hàng"
          hideLabel
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm theo tên hoặc số điện thoại khách"
          leading={<Search size={18} color={colors.muted} />}
          returnKeyType="search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {statusFilters.map((filter) => {
            const active = filter.value === status;
            return (
              <Pressable
                key={filter.label}
                onPress={() => setStatus(filter.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                  {filter.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <AppLoader />
        </View>
      ) : query.isError ? (
        <View style={styles.padded}>
          <ErrorState
            message="Không tải được danh sách lịch hẹn. Vui lòng thử lại."
            onRetry={() => void query.refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <AppText style={styles.count}>{items.length} lịch hẹn</AppText>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="Không có lịch hẹn"
              description={
                search || status
                  ? 'Không có lịch hẹn khớp bộ lọc trong ngày này.'
                  : 'Ngày này chưa có lịch hẹn nào.'
              }
            />
          }
          renderItem={({ item }) => (
            <OwnerAppointmentRow item={item} onPress={() => setSelectedId(item.id)} />
          )}
        />
      )}

      <OwnerAppointmentSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </AppScreen>
  );
}

function OwnerAppointmentRow({
  item,
  onPress,
}: {
  item: AppointmentListItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatLocalTime(item.startTime)}, ${item.service.name}, khách ${item.customer.fullName}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.time}>
          <Clock size={14} color={colors.primary} />
          <AppText style={styles.timeText}>
            {formatLocalTime(item.startTime)} – {formatLocalTime(item.endTime)}
          </AppText>
        </View>
        <AppointmentStatusBadge status={item.status} />
      </View>
      <AppText style={styles.service} numberOfLines={2}>
        {item.service.name}
      </AppText>
      <View style={styles.meta}>
        <UserRound size={14} color={colors.muted} />
        <AppText style={styles.metaText} numberOfLines={1}>
          {item.customer.fullName} · KTV {item.staff.fullName}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, backgroundColor: colors.background },
  top: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  dateLabel: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  dateText: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  dateHint: { fontSize: 12, color: colors.muted },
  chips: { gap: spacing.xs, paddingVertical: 2 },
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
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm, flexGrow: 1 },
  count: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 14, fontWeight: '700', color: colors.text },
  service: { fontSize: 15, fontWeight: '700', color: colors.primaryPressed },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, fontSize: 13, color: colors.muted },
});
