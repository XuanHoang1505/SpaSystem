import { useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUpDown, Package, Search, Sparkles, X } from 'lucide-react-native';
import type { PurchasedPackage, PurchasedService } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing } from '@theme/index';
import { PurchasedPackageCard } from '../components/PurchasedPackageCard';
import { PurchasedServiceCard } from '../components/PurchasedServiceCard';
import { useMyPurchases } from '../hooks/useMyPurchases';
import {
  classifyPurchaseError,
  countPackagesByStatus,
  countServicesByStatus,
  filterAndSortPackages,
  filterAndSortServices,
  type PackageFilterStatus,
  type PurchaseSortOrder,
  type PurchaseTabType,
  type ServiceFilterStatus,
} from '../utils/purchaseHelpers';

const EMPTY_PACKAGES: readonly PurchasedPackage[] = [];
const EMPTY_SERVICES: readonly PurchasedService[] = [];

const PACKAGE_FILTER_LABELS: { key: PackageFilterStatus; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang dùng' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'expired', label: 'Hết hạn' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const SERVICE_FILTER_LABELS: { key: ServiceFilterStatus; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'available', label: 'Còn hiệu lực' },
  { key: 'booked', label: 'Đã đặt lịch' },
  { key: 'used', label: 'Đã sử dụng' },
  { key: 'expired', label: 'Hết hạn' },
];

export function MyPurchasesScreen() {
  const { tab: queryTab } = useLocalSearchParams<{ tab?: string }>();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === 'authenticated';

  const [activeTab, setActiveTab] = useState<PurchaseTabType>(
    queryTab === 'services' ? 'services' : 'packages',
  );
  const [pkgFilter, setPkgFilter] = useState<PackageFilterStatus>('all');
  const [svcFilter, setSvcFilter] = useState<ServiceFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<PurchaseSortOrder>('newest');

  useEffect(() => {
    if (queryTab === 'services' || queryTab === 'packages') {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useMyPurchases(isAuthenticated);

  const packages = data?.packages ?? EMPTY_PACKAGES;
  const services = data?.services ?? EMPTY_SERVICES;

  const packageCounts = useMemo(() => countPackagesByStatus(packages), [packages]);
  const serviceCounts = useMemo(() => countServicesByStatus(services), [services]);

  const filteredPackages = useMemo(
    () =>
      filterAndSortPackages(packages, {
        statusFilter: pkgFilter,
        query: searchQuery,
        sort: sortOrder,
      }),
    [packages, pkgFilter, searchQuery, sortOrder],
  );

  const filteredServices = useMemo(
    () =>
      filterAndSortServices(services, {
        statusFilter: svcFilter,
        query: searchQuery,
        sort: sortOrder,
      }),
    [services, svcFilter, searchQuery, sortOrder],
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
            <Package size={32} color={colors.primary} />
          </View>
          <AppText style={styles.guestTitle}>Gói & Dịch vụ đã mua</AppText>
          <AppText style={styles.guestSubtitle}>
            Đăng nhập để xem gói liệu trình, dịch vụ lẻ bạn đã mua và đặt lịch sử dụng ngay trên
            điện thoại.
          </AppText>
          <View style={styles.guestBtnRow}>
            <AppButton
              title="Đăng nhập"
              onPress={() =>
                router.push(
                  `/(public)/login?redirect=${encodeURIComponent('/(customer)/packages')}`,
                )
              }
            />
            <AppButton
              title="Khám phá gói ưu đãi"
              variant="outline"
              onPress={() => router.push('/(public)/packages')}
            />
          </View>
        </View>
      </AppScreen>
    );
  }

  const handleBookPackageSession = (pkg: PurchasedPackage) => {
    if (!pkg.nextSession) return;
    router.push(
      `/booking/new?treatmentSessionId=${encodeURIComponent(
        pkg.nextSession.id,
      )}&treatmentPlanId=${encodeURIComponent(pkg.treatmentPlan.id)}`,
    );
  };

  const handleBookService = (service: PurchasedService) => {
    router.push(`/booking/new?serviceEntitlementId=${encodeURIComponent(service.id)}`);
  };

  const handleResetCurrentFilters = () => {
    setSearchQuery('');
    if (activeTab === 'packages') {
      setPkgFilter('all');
    } else {
      setSvcFilter('all');
    }
  };

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* 2 Segmented Tabs on Top of Screen */}
      <View style={styles.topTabsContainer}>
        <View style={styles.segmentedBar} accessibilityRole="tablist">
          <Pressable
            onPress={() => setActiveTab('packages')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'packages' }}
            accessibilityLabel={`Tab Gói liệu trình (${packages.length})`}
            style={[styles.segmentTab, activeTab === 'packages' && styles.segmentTabActive]}
          >
            <Package
              size={16}
              color={activeTab === 'packages' ? colors.onPrimary : colors.primary}
            />
            <AppText
              style={[
                styles.segmentTabText,
                activeTab === 'packages' && styles.segmentTabTextActive,
              ]}
            >
              Gói liệu trình ({packages.length})
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('services')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'services' }}
            accessibilityLabel={`Tab Dịch vụ lẻ (${services.length})`}
            style={[styles.segmentTab, activeTab === 'services' && styles.segmentTabActive]}
          >
            <Sparkles
              size={16}
              color={activeTab === 'services' ? colors.onPrimary : colors.primary}
            />
            <AppText
              style={[
                styles.segmentTabText,
                activeTab === 'services' && styles.segmentTabTextActive,
              ]}
            >
              Dịch vụ lẻ ({services.length})
            </AppText>
          </Pressable>
        </View>

        {/* Search & Sort Row */}
        <View style={styles.searchSortRow}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                activeTab === 'packages' ? 'Tìm tên gói, mã đơn...' : 'Tìm dịch vụ, mã đơn...'
              }
              placeholderTextColor={colors.muted}
              numberOfLines={1}
              multiline={false}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
              accessibilityLabel="Tìm theo tên"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Xóa từ khóa tìm kiếm"
              >
                <X size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setSortOrder((prev) => (prev === 'newest' ? 'expiring_soon' : 'newest'))}
            accessibilityRole="button"
            accessibilityLabel={`Sắp xếp: ${
              sortOrder === 'newest' ? 'Mới mua nhất' : 'Sắp hết hạn'
            }`}
            style={styles.sortButton}
          >
            <ArrowUpDown size={15} color={colors.primary} />
            <AppText style={styles.sortButtonText}>
              {sortOrder === 'newest' ? 'Mới nhất' : 'Sắp hết hạn'}
            </AppText>
          </Pressable>
        </View>

        {/* Dedicated Status Filter Chips per Tab */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {activeTab === 'packages'
            ? PACKAGE_FILTER_LABELS.filter(
                (item) => item.key !== 'cancelled' || packageCounts.cancelled > 0,
              ).map((item) => {
                const selected = pkgFilter === item.key;
                const count = packageCounts[item.key] ?? 0;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setPkgFilter(item.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.filterChip, selected && styles.filterChipSelected]}
                  >
                    <AppText
                      style={[styles.filterChipText, selected && styles.filterChipTextSelected]}
                    >
                      {item.label} ({count})
                    </AppText>
                  </Pressable>
                );
              })
            : SERVICE_FILTER_LABELS.map((item) => {
                const selected = svcFilter === item.key;
                const count = serviceCounts[item.key] ?? 0;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setSvcFilter(item.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.filterChip, selected && styles.filterChipSelected]}
                  >
                    <AppText
                      style={[styles.filterChipText, selected && styles.filterChipTextSelected]}
                    >
                      {item.label} ({count})
                    </AppText>
                  </Pressable>
                );
              })}
        </ScrollView>
      </View>

      {/* Body States */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải gói và dịch vụ đã mua...</AppText>
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <AppNotice
            tone="error"
            title="Không tải được dữ liệu"
            message={classifyPurchaseError(error).message}
          />
          <AppButton title="Thử lại" onPress={() => refetch()} />
        </View>
      ) : activeTab === 'packages' ? (
        <FlatList
          data={filteredPackages}
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
            <PurchasedPackageCard
              pkg={item}
              onPressDetail={(pkg) => router.push(`/my-packages/${pkg.id}`)}
              onPressBookNext={handleBookPackageSession}
              onPressTreatment={(pkg) => router.push(`/treatment/${pkg.treatmentPlan.id}`)}
            />
          )}
          ListEmptyComponent={
            packages.length === 0 ? (
              <View style={styles.emptyBox}>
                <Package size={36} color={colors.muted} />
                <AppText style={styles.emptyTitle}>Bạn chưa mua gói liệu trình nào</AppText>
                <AppText style={styles.emptyDesc}>
                  Mua gói liệu trình nhiều buổi để tiết kiệm đến 30% chi phí và theo dõi phác đồ
                  chăm sóc da chuyên sâu.
                </AppText>
                <View style={styles.emptyCtaRow}>
                  <AppButton
                    title="Xem gói liệu trình"
                    onPress={() => router.push('/(public)/packages')}
                  />
                  <AppButton
                    title="Khám phá dịch vụ"
                    variant="outline"
                    onPress={() => router.push('/(public)/services')}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <AppText style={styles.emptyTitle}>Không có gói nào phù hợp</AppText>
                <AppText style={styles.emptyDesc}>
                  Không tìm thấy gói liệu trình khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại.
                </AppText>
                <AppButton
                  title="Xem tất cả"
                  variant="outline"
                  onPress={handleResetCurrentFilters}
                />
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={filteredServices}
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
            <PurchasedServiceCard
              service={item}
              onPressBook={handleBookService}
              onPressAppointment={(appointmentId) => router.push(`/booking/${appointmentId}`)}
            />
          )}
          ListEmptyComponent={
            services.length === 0 ? (
              <View style={styles.emptyBox}>
                <Sparkles size={36} color={colors.muted} />
                <AppText style={styles.emptyTitle}>Bạn chưa mua dịch vụ lẻ nào</AppText>
                <AppText style={styles.emptyDesc}>
                  Bạn có thể thêm các dịch vụ chăm sóc da, massage vào giỏ hàng để mua trước và chủ
                  động đặt lịch bất cứ lúc nào.
                </AppText>
                <View style={styles.emptyCtaRow}>
                  <AppButton
                    title="Khám phá dịch vụ"
                    onPress={() => router.push('/(public)/services')}
                  />
                  <AppButton
                    title="Xem gói liệu trình"
                    variant="outline"
                    onPress={() => router.push('/(public)/packages')}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <AppText style={styles.emptyTitle}>Không có dịch vụ nào phù hợp</AppText>
                <AppText style={styles.emptyDesc}>
                  Không tìm thấy dịch vụ lẻ khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại.
                </AppText>
                <AppButton
                  title="Xem tất cả"
                  variant="outline"
                  onPress={handleResetCurrentFilters}
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
  errorContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  topTabsContainer: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentTab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  segmentTabTextActive: {
    color: colors.onPrimary,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchBox: {
    flex: 1,
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
  sortButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: colors.primarySoft,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  filterChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  filterChipTextSelected: {
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
  emptyCtaRow: {
    width: '100%',
    gap: spacing.xs,
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
