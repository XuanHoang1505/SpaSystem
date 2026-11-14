import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Search, Sparkles, X } from 'lucide-react-native';
import type { MyTreatmentListItem, TreatmentPlanStatus } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing } from '@theme/index';
import { TreatmentPlanCard } from '../components/TreatmentPlanCard';
import { useMyTreatments } from '../hooks/useMyTreatments';
import { classifyTreatmentError, filterTreatmentsByQuery } from '../utils/treatmentHelpers';

type StatusChipKey = 'all' | TreatmentPlanStatus;

const EMPTY_PLANS: readonly MyTreatmentListItem[] = [];

const STATUS_CHIPS: { key: StatusChipKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'in_progress', label: 'Đang thực hiện' },
  { key: 'not_started', label: 'Chưa bắt đầu' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'paused', label: 'Tạm dừng' },
  { key: 'cancelled', label: 'Đã hủy' },
];

export function MyTreatmentsScreen() {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === 'authenticated';

  const [selectedStatus, setSelectedStatus] = useState<StatusChipKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const apiStatus = selectedStatus === 'all' ? undefined : selectedStatus;
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyTreatments(
    apiStatus,
    isAuthenticated,
  );

  const plans = data ?? EMPTY_PLANS;
  const filteredPlans = useMemo(
    () => filterTreatmentsByQuery(plans, searchQuery),
    [plans, searchQuery],
  );

  if (authStatus === 'restoring') {
    return (
      <AppScreen scroll={false} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={styles.guestCard}>
          <View style={styles.guestIconCircle}>
            <Sparkles size={32} color={colors.primary} />
          </View>
          <AppText style={styles.guestTitle}>Theo dõi liệu trình chăm sóc da</AppText>
          <AppText style={styles.guestSubtitle}>
            Đăng nhập để xem tiến độ từng buổi chăm sóc da, ghi chú của kỹ thuật viên và đặt lịch
            cho buổi tiếp theo.
          </AppText>
          <View style={styles.guestBtnRow}>
            <AppButton
              title="Đăng nhập"
              onPress={() =>
                router.push(
                  `/(public)/login?redirect=${encodeURIComponent('/(customer)/treatments')}`,
                )
              }
            />
            <AppButton
              title="Xem gói liệu trình"
              variant="outline"
              onPress={() => router.push('/(public)/packages')}
            />
          </View>
        </View>
      </AppScreen>
    );
  }

  const handleBookNext = (plan: MyTreatmentListItem) => {
    if (!plan.nextSession) return;
    router.push(
      `/booking/new?treatmentSessionId=${encodeURIComponent(
        plan.nextSession.id,
      )}&treatmentPlanId=${encodeURIComponent(plan.id)}`,
    );
  };

  const hasActiveFilter = selectedStatus !== 'all' || searchQuery.trim().length > 0;

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Filter Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm tên gói, chuyên viên..."
            placeholderTextColor={colors.muted}
            numberOfLines={1}
            multiline={false}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
            accessibilityLabel="Tìm liệu trình"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Xóa tìm kiếm"
            >
              <X size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {STATUS_CHIPS.map((chip) => {
            const selected = selectedStatus === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setSelectedStatus(chip.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <AppText style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {chip.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải danh sách liệu trình...</AppText>
        </View>
      ) : isError ? (
        <View style={styles.errorWrap}>
          <AppNotice
            tone="error"
            title="Không tải được liệu trình"
            message={classifyTreatmentError(error).message}
          />
          <AppButton title="Thử lại" onPress={() => refetch()} />
        </View>
      ) : (
        <FlatList
          data={filteredPlans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TreatmentPlanCard
              plan={item}
              onPressDetail={(plan) => router.push(`/treatment/${plan.id}`)}
              onPressBookNext={handleBookNext}
            />
          )}
          ListEmptyComponent={
            !hasActiveFilter ? (
              <View style={styles.emptyBox}>
                <Sparkles size={36} color={colors.muted} />
                <AppText style={styles.emptyTitle}>Bạn chưa có liệu trình chăm sóc nào</AppText>
                <AppText style={styles.emptyDesc}>
                  Khi bạn mua một gói dịch vụ nhiều buổi, phác đồ chăm sóc da sẽ được khởi tạo tại
                  đây để bạn theo dõi từng buổi.
                </AppText>
                <View style={styles.emptyCtaWrap}>
                  <AppButton
                    title="Khám phá gói dịch vụ"
                    onPress={() => router.push('/(public)/packages')}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <AppText style={styles.emptyTitle}>Không tìm thấy liệu trình phù hợp</AppText>
                <AppText style={styles.emptyDesc}>
                  Không có liệu trình nào khớp với trạng thái hoặc từ khóa bạn đang chọn.
                </AppText>
                <AppButton
                  title="Xem tất cả"
                  variant="outline"
                  onPress={() => {
                    setSelectedStatus('all');
                    setSearchQuery('');
                  }}
                />
              </View>
            )
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  errorWrap: {
    padding: spacing.md,
    gap: spacing.md,
  },
  toolbar: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCtaWrap: {
    width: '100%',
    marginTop: spacing.xs,
  },
  guestCard: {
    margin: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  guestBtnRow: {
    width: '100%',
    gap: spacing.sm,
  },
});
