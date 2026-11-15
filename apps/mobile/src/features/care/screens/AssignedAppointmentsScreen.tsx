import { useState, useMemo, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AssignedAppointmentStatus, AssignedAppointment } from '@spa/shared-types';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { EmptyState } from '@components/common/EmptyState';
import { ErrorState } from '@components/common/ErrorState';
import { colors } from '@/theme/colors';
import { CalendarX2 } from 'lucide-react-native';
import { AssignedFiltersBar } from '../components/AssignedFiltersBar';
import { AssignedAppointmentCard } from '../components/AssignedAppointmentCard';
import { useAssignedAppointments } from '../hooks/useAssignedAppointments';
import { getAssignedPreset, type AssignedTab } from '../utils/careHelpers';

export function AssignedAppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<AssignedTab>('today');
  const [statusFilter, setStatusFilter] = useState<AssignedAppointmentStatus | undefined>(undefined);

  const preset = useMemo(() => getAssignedPreset(activeTab), [activeTab]);

  const queryParams = useMemo(() => {
    return {
      fromDate: preset.from,
      toDate: preset.to,
      status: statusFilter ?? preset.status,
    };
  }, [preset, statusFilter]);

  const { data: appointments, isLoading, isError, error, refetch, isRefetching } =
    useAssignedAppointments(queryParams);

  const isCustomFiltered = statusFilter !== undefined && statusFilter !== preset.status;

  const handleSelectTab = useCallback((tab: AssignedTab) => {
    setActiveTab(tab);
    setStatusFilter(undefined);
  }, []);

  const handleSelectStatus = useCallback((status: AssignedAppointmentStatus | undefined) => {
    setStatusFilter(status);
  }, []);

  const handleResetFilters = useCallback(() => {
    setStatusFilter(undefined);
  }, []);

  const handleSelectAppointment = useCallback(
    (id: string) => {
      router.push({
        pathname: '/(staff)/bookings/[bookingId]',
        params: { bookingId: id },
      });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: AssignedAppointment }) => (
      <AssignedAppointmentCard appointment={item} onPress={handleSelectAppointment} />
    ),
    [handleSelectAppointment],
  );

  const keyExtractor = useCallback((item: AssignedAppointment) => item.id, []);

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AppText style={styles.title}>Lịch hẹn được phân công</AppText>
      </View>

      <AssignedFiltersBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        statusFilter={statusFilter ?? preset.status}
        onSelectStatus={handleSelectStatus}
        isCustomFiltered={isCustomFiltered}
        onResetFilters={handleResetFilters}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
        </View>
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi tải danh sách lịch hẹn.'}
          onRetry={() => {
            refetch();
          }}
        />
      ) : appointments && appointments.length > 0 ? (
        <FlatList
          data={appointments}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={CalendarX2}
            title="Chưa có lịch hẹn"
            description={
              activeTab === 'today'
                ? 'Hôm nay bạn chưa được phân công buổi chăm sóc nào.'
                : 'Không có lịch hẹn nào trong khoảng thời gian hoặc bộ lọc đã chọn.'
            }
            action={
              isCustomFiltered ? (
                <AppButton
                  title="Xóa bộ lọc"
                  variant="outline"
                  onPress={handleResetFilters}
                />
              ) : undefined
            }
          />
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  skeletonCard: {
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
