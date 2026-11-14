import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { PackageListItem } from '@spa/shared-types';
import { PackageSearch, SlidersHorizontal } from 'lucide-react-native';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppTextButton } from '@components/common/AppTextButton';
import { CatalogSearchInput } from '@/features/services/components/CatalogSearchInput';
import { PriceFilterSheet } from '@/features/services/components/PriceFilterSheet';
import { useDebouncedValue } from '@/features/services/hooks/useDebouncedValue';
import { colors, spacing, typography } from '@theme/index';
import { PackageCard } from '../components/PackageCard';
import { PackageSkeleton } from '../components/PackageSkeleton';
import { usePackageSearch } from '../hooks/usePackageSearch';
import { CartBadgeButton } from '@/features/orders';

export function PackagesListScreen() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch, minPrice, maxPrice]);

  const { data, isLoading, isError, isFetching, refetch } = usePackageSearch({
    search: debouncedSearch.trim() || undefined,
    minPrice,
    maxPrice,
    pageNumber,
    pageSize,
  });

  const [accumulatedItems, setAccumulatedItems] = useState<readonly PackageListItem[]>([]);

  useEffect(() => {
    if (!data?.items) return;
    if (pageNumber === 1) {
      setAccumulatedItems(data.items);
    } else {
      setAccumulatedItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = data.items.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [data, pageNumber]);

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || minPrice !== undefined || maxPrice !== undefined,
  );

  const handleResetAllFilters = () => {
    setSearch('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setPageNumber(1);
  };

  const handleEndReached = () => {
    if (isFetching || isLoading) return;
    if (data && pageNumber < data.totalPages) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <View style={styles.topHeaderBar}>
        <AppText style={styles.screenTitle}>Gói chăm sóc</AppText>
        <CartBadgeButton />
      </View>
      <View style={styles.headerArea}>
        <CatalogSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm gói chăm sóc, combo liệu trình..."
        />
        <View style={styles.filterBar}>
          <AppText style={styles.resultCount}>
            {data ? `${data.totalCount} gói chăm sóc` : 'Đang tải...'}
          </AppText>
          <Pressable
            onPress={() => setIsFilterSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Mở bộ lọc khoảng giá gói"
            style={[styles.filterPill, hasPriceFilter && styles.filterPillActive]}
          >
            <SlidersHorizontal size={16} color={hasPriceFilter ? colors.onPrimary : colors.muted} />
            <AppText style={[styles.filterPillText, hasPriceFilter && styles.filterPillTextActive]}>
              Khoảng giá
            </AppText>
          </Pressable>
        </View>
      </View>

      {isError && pageNumber === 1 && (
        <View style={styles.centerNotice}>
          <AppNotice
            tone="error"
            title="Không thể tải danh sách gói"
            message="Đã có lỗi xảy ra khi tải dữ liệu gói dịch vụ. Vui lòng thử lại."
          />
          <View style={styles.retryButton}>
            <AppTextButton title="Thử lại" onPress={() => refetch()} />
          </View>
        </View>
      )}

      {isLoading && pageNumber === 1 ? (
        <View style={styles.skeletonList}>
          <PackageSkeleton />
          <PackageSkeleton />
          <PackageSkeleton />
        </View>
      ) : (
        <FlatList
          data={accumulatedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PackageCard pkg={item} onPress={() => router.push(`/(public)/packages/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && pageNumber === 1}
              onRefresh={() => {
                setPageNumber(1);
                refetch();
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetching && pageNumber > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading && !isError ? (
              <View style={styles.emptyContainer}>
                <PackageSearch size={48} color={colors.muted} />
                <AppText style={styles.emptyTitle}>Chưa có gói chăm sóc phù hợp</AppText>
                <AppText style={styles.emptySubtitle}>
                  {hasActiveFilters
                    ? 'Hãy thử điều chỉnh lại mức giá hoặc từ khóa tìm kiếm.'
                    : 'Hiện chưa có gói dịch vụ nào đang mở bán.'}
                </AppText>
                {hasActiveFilters && (
                  <View style={styles.clearFilterBtn}>
                    <AppTextButton title="Xóa tất cả bộ lọc" onPress={handleResetAllFilters} />
                  </View>
                )}
              </View>
            ) : null
          }
        />
      )}

      <PriceFilterSheet
        visible={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        initialMinPrice={minPrice}
        initialMaxPrice={maxPrice}
        onApply={(newMin, newMax) => {
          setMinPrice(newMin);
          setMaxPrice(newMax);
        }}
        onReset={() => {
          setMinPrice(undefined);
          setMaxPrice(undefined);
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    backgroundColor: colors.background,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerArea: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  resultCount: {
    fontSize: typography.small,
    color: colors.muted,
  },
  filterPill: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexGrow: 1,
  },
  skeletonList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  centerNotice: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  retryButton: {
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.body,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.small,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  clearFilterBtn: {
    marginTop: spacing.sm,
  },
});
