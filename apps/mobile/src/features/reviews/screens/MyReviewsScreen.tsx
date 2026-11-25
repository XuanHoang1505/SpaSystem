import { useState, useMemo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MessageSquareHeart } from 'lucide-react-native';
import type { MyReview, ReviewableProduct } from '@spa/shared-types';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { AppLoader } from '@components/common/AppLoader';
import { ErrorState } from '@components/common/ErrorState';
import { EmptyState } from '@components/common/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { useReviewableProducts } from '../hooks/useReviewableProducts';
import { useMyReviews } from '../hooks/useMyReviews';
import { ReviewableProductCard } from '../components/ReviewableProductCard';
import { MyReviewCard } from '../components/MyReviewCard';
import { ReviewFormModal } from '../components/ReviewFormModal';
import { ReviewImageModal } from '../components/ReviewImageModal';

type ReviewsTab = 'pending' | 'reviewed';

export function MyReviewsScreen() {
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === 'authenticated';

  const [activeTab, setActiveTab] = useState<ReviewsTab>('pending');

  // Modal states
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedReviewable, setSelectedReviewable] = useState<ReviewableProduct | null>(null);
  const [selectedReviewToEdit, setSelectedReviewToEdit] = useState<MyReview | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Queries
  const reviewablesQuery = useReviewableProducts(isAuthenticated);
  const myReviewsQuery = useMyReviews({ pageNumber: 1, pageSize: 50, enabled: isAuthenticated });

  const reviewables = useMemo<readonly ReviewableProduct[]>(
    () => reviewablesQuery.data ?? [],
    [reviewablesQuery.data],
  );
  const myReviews = myReviewsQuery.data?.items ?? [];

  // Count items eligible to review
  const pendingCount = useMemo(
    () => reviewables.filter((item) => item.eligible).length,
    [reviewables],
  );
  const reviewedCount = myReviewsQuery.data?.totalCount ?? myReviews.length;

  const handleOpenCreate = useCallback((item: ReviewableProduct) => {
    setSelectedReviewable(item);
    setSelectedReviewToEdit(null);
    setFormModalVisible(true);
  }, []);

  const handleOpenEdit = useCallback((review: MyReview) => {
    setSelectedReviewToEdit(review);
    setSelectedReviewable(null);
    setFormModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setFormModalVisible(false);
    setSelectedReviewable(null);
    setSelectedReviewToEdit(null);
  }, []);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/profile');
    }
  }, []);

  const handleRefreshCurrentTab = useCallback(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'pending') {
      void reviewablesQuery.refetch();
    } else {
      void myReviewsQuery.refetch();
    }
  }, [activeTab, isAuthenticated, reviewablesQuery, myReviewsQuery]);

  const handleFormSuccess = useCallback(() => {
    void reviewablesQuery.refetch();
    void myReviewsQuery.refetch();
  }, [reviewablesQuery, myReviewsQuery]);

  if (authStatus === 'restoring') {
    return (
      <AppScreen scroll={false} style={styles.centered}>
        <AppLoader />
      </AppScreen>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            onPress={handleGoBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <AppText style={styles.headerTitle}>Đánh giá của tôi</AppText>
            <AppText style={styles.headerSubtitle}>
              Theo dõi và gửi đánh giá dịch vụ đã sử dụng
            </AppText>
          </View>
        </View>

        <View style={styles.centered}>
          <EmptyState
            title="Đăng nhập để xem đánh giá"
            description="Vui lòng đăng nhập tài khoản thành viên để theo dõi và gửi đánh giá các dịch vụ đã trải nghiệm."
          />
          <View style={styles.loginBtnWrap}>
            <AppButton
              title="Đăng nhập ngay"
              onPress={() =>
                router.push(`/(public)/login?redirect=${encodeURIComponent('/my-reviews')}`)
              }
            />
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          onPress={handleGoBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <AppText style={styles.headerTitle}>Đánh giá của tôi</AppText>
          <AppText style={styles.headerSubtitle}>
            Theo dõi và gửi đánh giá dịch vụ đã sử dụng
          </AppText>
        </View>
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setActiveTab('pending')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'pending' }}
          accessibilityLabel={`Tab Chờ đánh giá (${pendingCount})`}
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
        >
          <Clock size={16} color={activeTab === 'pending' ? colors.primary : colors.muted} />
          <AppText style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Chờ đánh giá
          </AppText>
          {pendingCount > 0 ? (
            <View
              style={[
                styles.badge,
                activeTab === 'pending' ? styles.badgeActive : styles.badgeInactive,
              ]}
            >
              <AppText
                style={[
                  styles.badgeText,
                  activeTab === 'pending' ? styles.badgeTextActive : styles.badgeTextInactive,
                ]}
              >
                {pendingCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('reviewed')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'reviewed' }}
          accessibilityLabel={`Tab Đã đánh giá (${reviewedCount})`}
          style={[styles.tab, activeTab === 'reviewed' && styles.tabActive]}
        >
          <MessageSquareHeart
            size={16}
            color={activeTab === 'reviewed' ? colors.primary : colors.muted}
          />
          <AppText style={[styles.tabText, activeTab === 'reviewed' && styles.tabTextActive]}>
            Đã đánh giá
          </AppText>
          {reviewedCount > 0 ? (
            <View
              style={[
                styles.badge,
                activeTab === 'reviewed' ? styles.badgeActive : styles.badgeInactive,
              ]}
            >
              <AppText
                style={[
                  styles.badgeText,
                  activeTab === 'reviewed' ? styles.badgeTextActive : styles.badgeTextInactive,
                ]}
              >
                {reviewedCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'pending' ? (
        reviewablesQuery.isLoading ? (
          <View style={styles.centered}>
            <AppLoader />
          </View>
        ) : reviewablesQuery.isError ? (
          <View style={styles.centered}>
            <ErrorState
              message="Không thể tải danh sách dịch vụ chờ đánh giá."
              onRetry={() => void reviewablesQuery.refetch()}
            />
          </View>
        ) : reviewables.length === 0 ? (
          <View style={styles.centered}>
            <EmptyState
              title="Chưa có dịch vụ nào chờ đánh giá"
              description="Sau khi bạn trải nghiệm xong dịch vụ hoặc buổi trị liệu tại spa, bạn có thể gửi phản hồi tại đây."
            />
          </View>
        ) : (
          <FlatList
            data={reviewables}
            keyExtractor={(item) => `${item.productType}_${item.productId}`}
            renderItem={({ item }) => (
              <ReviewableProductCard
                item={item}
                onReview={handleOpenCreate}
                onViewReviewed={() => setActiveTab('reviewed')}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={reviewablesQuery.isRefetching}
                onRefresh={handleRefreshCurrentTab}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )
      ) : myReviewsQuery.isLoading ? (
        <View style={styles.centered}>
          <AppLoader />
        </View>
      ) : myReviewsQuery.isError ? (
        <View style={styles.centered}>
          <ErrorState
            message="Không thể tải danh sách đánh giá của bạn."
            onRetry={() => void myReviewsQuery.refetch()}
          />
        </View>
      ) : myReviews.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            title="Bạn chưa có đánh giá nào"
            description="Hãy chia sẻ đánh giá về dịch vụ đã trải nghiệm để giúp Spa nâng cao chất lượng phục vụ."
          />
        </View>
      ) : (
        <FlatList
          data={myReviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MyReviewCard
              review={item}
              onEdit={handleOpenEdit}
              onPressImage={(url) => setPreviewImageUrl(url)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={myReviewsQuery.isRefetching}
              onRefresh={handleRefreshCurrentTab}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Review Form Modal */}
      <ReviewFormModal
        visible={formModalVisible}
        onClose={handleCloseModal}
        targetProduct={selectedReviewable}
        existingReview={selectedReviewToEdit}
        onSuccess={handleFormSuccess}
      />

      {/* Full-screen Image Preview Modal */}
      <ReviewImageModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
  },
  tabTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: colors.primary,
  },
  badgeInactive: {
    backgroundColor: '#E5E7EB',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  badgeTextInactive: {
    color: colors.muted,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loginBtnWrap: {
    marginTop: 20,
    width: '100%',
    maxWidth: 240,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
});
