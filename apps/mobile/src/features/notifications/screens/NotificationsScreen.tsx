import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCheck, BellOff } from 'lucide-react-native';
import { AppScreen } from '@/components/common/AppScreen';
import { AppText } from '@/components/common/AppText';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { AppLoader } from '@/components/common/AppLoader';
import { colors } from '@theme/index';
import { useAuthStore } from '@/stores/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import { useNotificationMutations } from '../hooks/useNotificationMutations';
import { useNotificationRealtime } from '../hooks/useNotificationRealtime';
import { NotificationCard } from '../components/NotificationCard';
import { getMobileNotificationTargetRoute } from '../types';
import type { NotificationDto } from '@spa/shared-types';

export function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/(public)/login?redirect=/notifications' as Href);
    }
  }, [status, router]);

  useNotificationRealtime();

  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.count ?? 0;

  const { data, isLoading, isError, refetch, isFetching } = useNotifications({
    unreadOnly,
    pageNumber: page,
    pageSize: 20,
  });

  const { markRead, markAllRead, isMarkingAllRead } = useNotificationMutations();

  if (status !== 'authenticated' || !user) {
    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={styles.loaderContainer}>
          <AppLoader />
        </View>
      </AppScreen>
    );
  }

  const items = data?.items ?? [];

  const handleTabChange = (isUnread: boolean) => {
    setUnreadOnly(isUnread);
    setPage(1);
  };

  const handleItemPress = (item: NotificationDto) => {
    if (!item.isRead) {
      markRead(item.id);
    }
    const targetRoute = getMobileNotificationTargetRoute(item, user?.role);
    if (targetRoute) {
      router.push(targetRoute as Href);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(
        user?.role === 'staff'
          ? '/(staff)/dashboard'
          : user?.role === 'owner'
            ? '/(owner)/dashboard'
            : '/(customer)/home',
      );
    }
  };

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Screen Header - Full Width with Status Bar inset */}
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
          Thông báo
        </AppText>

        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đánh dấu tất cả đã đọc"
            onPress={() => markAllRead()}
            disabled={isMarkingAllRead}
            style={styles.readAllButton}
            hitSlop={8}
          >
            <CheckCheck size={18} color={colors.primary} />
            <AppText style={styles.readAllText}>Đọc tất cả</AppText>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Tabs - Full Width Bar */}
      <View style={styles.tabBar}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: !unreadOnly }}
          onPress={() => handleTabChange(false)}
          style={[styles.tab, !unreadOnly && styles.activeTab]}
        >
          <AppText style={[styles.tabText, !unreadOnly && styles.activeTabText]}>Tất cả</AppText>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: unreadOnly }}
          onPress={() => handleTabChange(true)}
          style={[styles.tab, unreadOnly && styles.activeTab]}
        >
          <AppText style={[styles.tabText, unreadOnly && styles.activeTabText]}>Chưa đọc</AppText>
          {unreadCount > 0 && (
            <View style={styles.tabBadge}>
              <AppText style={styles.tabBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <AppLoader />
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <ErrorState
            message="Không thể tải thông báo. Vui lòng thử lại."
            onRetry={() => refetch()}
          />
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationCard item={item} onPress={handleItemPress} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => refetch()}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={BellOff}
              title={unreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              description={
                unreadOnly
                  ? 'Bạn đã đọc hết tất cả thông báo.'
                  : 'Các thông báo về lịch hẹn và liệu trình sẽ hiển thị ở đây.'
              }
            />
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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  readAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 8,
  },
  readAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  headerSpacer: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    minHeight: 38,
  },
  activeTab: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  },
  activeTabText: {
    fontWeight: '700',
    color: colors.primary,
  },
  tabBadge: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
