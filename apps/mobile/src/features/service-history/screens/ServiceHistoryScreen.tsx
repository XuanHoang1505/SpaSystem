import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, History } from 'lucide-react-native';
import type { AppointmentStatus, ServiceHistoryItem } from '@spa/shared-types';
import { AppButton } from '@/components/common/AppButton';
import { AppLoader } from '@/components/common/AppLoader';
import { AppScreen } from '@/components/common/AppScreen';
import { AppText } from '@/components/common/AppText';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@theme/index';
import { ServiceHistoryCard } from '../components/ServiceHistoryCard';
import { ServiceHistoryDetailModal } from '../components/ServiceHistoryDetailModal';
import { useServiceHistory } from '../hooks/useServiceHistory';

type StatusFilterKey = 'all' | 'completed' | 'no_show';

const STATUS_CHIPS: { key: StatusFilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'no_show', label: 'Không đến' },
];

export function ServiceHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((s) => s.status);
  const isAuthenticated = authStatus === 'authenticated';

  const [selectedStatus, setSelectedStatus] = useState<StatusFilterKey>('all');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const apiStatus = selectedStatus === 'all' ? undefined : (selectedStatus as AppointmentStatus);

  const { data, isLoading, isError, refetch, isRefetching } = useServiceHistory(
    {
      status: apiStatus,
      pageNumber: 1,
      pageSize: 50,
    },
    isAuthenticated,
  );

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/profile' as Href);
    }
  };

  if (authStatus === 'restoring') {
    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={styles.centerContainer}>
          <AppLoader />
        </View>
      </AppScreen>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppScreen scroll={false} style={styles.screen}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={handleGoBack}
            style={styles.backButton}
            hitSlop={8}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <AppText accessibilityRole="header" style={styles.headerTitle}>
            Lịch sử sử dụng
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.guestContainer}>
          <View style={styles.guestIconCircle}>
            <History size={32} color={colors.primary} />
          </View>
          <AppText style={styles.guestTitle}>Lịch sử sử dụng dịch vụ</AppText>
          <AppText style={styles.guestSubtitle}>
            Đăng nhập để xem lại các buổi chăm sóc da, kỹ thuật viên phụ trách, ghi chú trị liệu và
            đánh giá dịch vụ.
          </AppText>
          <View style={styles.guestBtnRow}>
            <AppButton
              title="Đăng nhập"
              onPress={() =>
                router.push(
                  `/(public)/login?redirect=${encodeURIComponent('/(customer)/history')}`,
                )
              }
            />
            <AppButton
              title="Khám phá dịch vụ"
              variant="outline"
              onPress={() => router.push('/(public)/services')}
            />
          </View>
        </View>
      </AppScreen>
    );
  }

  const items = data?.items ?? [];

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Edge-to-edge Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={handleGoBack}
          style={styles.backButton}
          hitSlop={8}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>

        <AppText accessibilityRole="header" style={styles.headerTitle}>
          Lịch sử sử dụng
        </AppText>

        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        {STATUS_CHIPS.map((chip) => {
          const isActive = selectedStatus === chip.key;
          return (
            <Pressable
              key={chip.key}
              onPress={() => setSelectedStatus(chip.key)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Lọc theo ${chip.label}`}
            >
              <AppText style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {chip.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <AppLoader />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <ErrorState
            message="Không thể tải lịch sử sử dụng dịch vụ. Vui lòng thử lại."
            onRetry={() => refetch()}
          />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={History}
            title={selectedStatus === 'all' ? 'Chưa có lịch sử dịch vụ' : 'Không tìm thấy lịch sử'}
            description={
              selectedStatus === 'all'
                ? 'Bạn chưa có buổi chăm sóc nào đã hoàn thành hoặc ghi nhận không đến.'
                : `Không có lần sử dụng dịch vụ nào ở trạng thái "${
                    STATUS_CHIPS.find((c) => c.key === selectedStatus)?.label
                  }".`
            }
            action={
              selectedStatus !== 'all' ? (
                <AppButton
                  title="Xem tất cả lịch sử"
                  variant="outline"
                  onPress={() => setSelectedStatus('all')}
                />
              ) : (
                <AppButton
                  title="Khám phá dịch vụ ngay"
                  onPress={() => router.push('/(public)/services')}
                />
              )
            }
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.appointmentId}
          renderItem={({ item }: { item: ServiceHistoryItem }) => (
            <ServiceHistoryCard
              item={item}
              onPress={() => setSelectedAppointmentId(item.appointmentId)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + spacing.lg },
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail Bottom Sheet Modal */}
      <ServiceHistoryDetailModal
        visible={Boolean(selectedAppointmentId)}
        appointmentId={selectedAppointmentId}
        onClose={() => setSelectedAppointmentId(null)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  },
  filterChipTextActive: {
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  guestIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  guestBtnRow: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
