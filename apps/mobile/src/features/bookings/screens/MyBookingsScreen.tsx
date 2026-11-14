import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { MyAppointmentListItem, MyAppointmentScope } from '@spa/shared-types';
import { CalendarPlus, CalendarX2 } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing } from '@theme/index';
import { AppointmentCard } from '../components/AppointmentCard';
import { CancelAppointmentModal } from '../components/CancelAppointmentModal';
import { RescheduleAppointmentModal } from '../components/RescheduleAppointmentModal';
import { useMyAppointments } from '../hooks/useMyAppointments';

const SCOPE_TABS: { key: MyAppointmentScope; label: string }[] = [
  { key: 'upcoming', label: 'Sắp tới' },
  { key: 'past', label: 'Đã qua' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const PAGE_SIZE = 10;

export function MyBookingsScreen() {
  const authStatus = useAuthStore((state) => state.status);

  const [scope, setScope] = useState<MyAppointmentScope>('upcoming');
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [rescheduleTarget, setRescheduleTarget] = useState<MyAppointmentListItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MyAppointmentListItem | null>(null);

  const appointmentsQuery = useMyAppointments({
    scope,
    pageNumber,
    pageSize: PAGE_SIZE,
  });

  if (authStatus !== 'authenticated') {
    return (
      <AppScreen scroll={false} style={styles.screenContainer}>
        <View style={styles.centerBox}>
          <CalendarX2 size={48} color={colors.muted} />
          <AppText style={styles.emptyTitle}>Đăng nhập để quản lý lịch hẹn</AppText>
          <AppText style={styles.emptySubtitle}>
            Đăng nhập để xem lịch hẹn sắp tới, đổi giờ hoặc đặt lịch chăm sóc mới tại Như Nguyệt
            Spa.
          </AppText>
          <View style={styles.centerAction}>
            <AppButton
              title="Đăng nhập"
              onPress={() =>
                router.push(
                  `/(public)/login?redirect=${encodeURIComponent('/(customer)/bookings')}`,
                )
              }
            />
          </View>
        </View>
      </AppScreen>
    );
  }

  const items = appointmentsQuery.data?.items ?? [];
  const totalCount = appointmentsQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const emptyMessage =
    scope === 'upcoming'
      ? 'Bạn chưa có lịch hẹn nào sắp tới.'
      : scope === 'past'
        ? 'Chưa có lịch hẹn nào đã hoàn thành hoặc đã qua.'
        : 'Không có lịch hẹn nào đã hủy hoặc hết hạn giữ chỗ.';

  return (
    <AppScreen scroll={false} style={styles.screenContainer}>
      {/* Scope Tabs + New Booking CTA */}
      <View style={styles.tabsBar}>
        <View style={styles.tabsGroup}>
          {SCOPE_TABS.map((tab) => {
            const isSelected = scope === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setScope(tab.key);
                  setPageNumber(1);
                }}
                accessibilityRole="tab"
                accessibilityLabel={`Tab ${tab.label}`}
                accessibilityState={{ selected: isSelected }}
                style={[styles.tabButton, isSelected && styles.tabButtonSelected]}
              >
                <AppText style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => router.push('/(public)/services')}
          accessibilityRole="button"
          accessibilityLabel="Đặt lịch hẹn mới"
          style={styles.newBookingBtn}
        >
          <CalendarPlus size={15} color={colors.onPrimary} />
          <AppText style={styles.newBookingBtnText}>Đặt lịch</AppText>
        </Pressable>
      </View>

      {/* Content */}
      {appointmentsQuery.isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải danh sách lịch hẹn...</AppText>
        </View>
      ) : appointmentsQuery.isError ? (
        <View style={styles.centerBox}>
          <AppNotice
            tone="error"
            title="Không tải được lịch hẹn"
            message={
              appointmentsQuery.error?.message ?? 'Đã xảy ra lỗi khi tải danh sách lịch hẹn.'
            }
          />
          <View style={styles.centerAction}>
            <AppButton title="Thử lại" onPress={() => void appointmentsQuery.refetch()} />
          </View>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerBox}>
          <CalendarX2 size={48} color={colors.muted} />
          <AppText style={styles.emptyTitle}>{emptyMessage}</AppText>
          {scope === 'upcoming' && (
            <>
              <AppText style={styles.emptySubtitle}>
                Hãy chọn một dịch vụ yêu thích và đặt lịch hẹn chăm sóc ngay hôm nay.
              </AppText>
              <View style={styles.centerAction}>
                <AppButton
                  title="Đặt lịch hẹn ngay"
                  onPress={() => router.push('/(public)/services')}
                />
              </View>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={appointmentsQuery.isRefetching}
              onRefresh={() => void appointmentsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <AppointmentCard
              item={item}
              onPressDetail={() => router.push(`/booking/${item.id}`)}
              onPressReschedule={item.canReschedule ? () => setRescheduleTarget(item) : undefined}
              onPressCancel={item.canCancel ? () => setCancelTarget(item) : undefined}
              onHoldExpired={() => void appointmentsQuery.refetch()}
            />
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <AppButton
                  title="Trang trước"
                  variant="outline"
                  disabled={pageNumber <= 1}
                  onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
                />
                <AppText style={styles.pageText}>
                  Trang {pageNumber}/{totalPages}
                </AppText>
                <AppButton
                  title="Trang tiếp"
                  variant="outline"
                  disabled={pageNumber >= totalPages}
                  onPress={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                />
              </View>
            ) : null
          }
        />
      )}

      {/* Modals */}
      <RescheduleAppointmentModal
        visible={Boolean(rescheduleTarget)}
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => void appointmentsQuery.refetch()}
      />

      <CancelAppointmentModal
        visible={Boolean(cancelTarget)}
        appointment={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={() => void appointmentsQuery.refetch()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 0,
    backgroundColor: colors.background,
  },
  tabsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
  },
  tabButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  tabTextSelected: {
    color: colors.onPrimary,
  },
  newBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9999,
    minHeight: 40,
  },
  newBookingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  centerAction: {
    width: '100%',
    maxWidth: 240,
    marginTop: spacing.xs,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  pageText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
});
