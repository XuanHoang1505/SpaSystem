import { useState, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppLoader } from '@components/common/AppLoader';
import { ErrorState } from '@components/common/ErrorState';
import { EmptyState } from '@components/common/EmptyState';
import { colors } from '@/theme/colors';
import { useCareHistory } from '../hooks/useCareHistory';
import { CareHistoryCard } from '../components/history/CareHistoryCard';
import { CareHistorySearchBar } from '../components/history/CareHistorySearchBar';
import { ArrowLeft, Clock, SearchX } from 'lucide-react-native';

export function StaffCareHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useCareHistory({ search });

  // Flatten all pages
  const items = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const handlePressCard = (appointmentId: string) => {
    router.push(`/(staff)/bookings/${appointmentId}`);
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Top Navbar */}
      <View style={[styles.navbar, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.navTitleGroup}>
          <AppText accessibilityRole="header" style={styles.navTitle}>
            Lịch sử chăm sóc
          </AppText>
          <AppText style={styles.navSub}>Các khách hàng bạn đã chăm sóc hoàn thành</AppText>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <CareHistorySearchBar
          value={search}
          onChange={setSearch}
        />
      </View>

      {/* Content Area */}
      {isLoading ? (
        <View style={styles.centeredWrap}>
          <AppLoader />
          <AppText style={styles.loadingText}>Đang tải lịch sử chăm sóc...</AppText>
        </View>
      ) : isError ? (
        <View style={styles.centeredWrap}>
          <ErrorState
            message="Không thể kết nối đến máy chủ để tải lịch sử. Vui lòng thử lại."
            onRetry={() => refetch()}
          />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centeredWrap}>
          {search.trim().length > 0 ? (
            <EmptyState
              icon={SearchX}
              title="Không tìm thấy khách hàng"
              description={`Không có lượt chăm sóc nào khớp với từ khóa "${search.trim()}".`}
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="Chưa có lịch sử chăm sóc"
              description="Các buổi chăm sóc khách hàng sau khi bạn xác nhận hoàn thành sẽ được lưu trữ tại đây."
            />
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.appointmentId}
          renderItem={({ item }) => (
            <CareHistoryCard
              item={item}
              onPress={() => handlePressCard(item.appointmentId)}
            />
          )}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <AppLoader />
                <AppText style={styles.footerLoaderText}>Đang tải thêm...</AppText>
              </View>
            ) : null
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleGroup: {
    flex: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  navSub: {
    fontSize: 12,
    color: colors.muted,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  centeredWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.muted,
  },
  footerLoaderText: {
    fontSize: 12,
    color: colors.muted,
  },
});
