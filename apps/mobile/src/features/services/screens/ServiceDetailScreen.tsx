import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServiceStep } from '@spa/shared-types';
import { CheckCircle2, Clock, Sparkles, Star, Tag } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppTextButton } from '@components/common/AppTextButton';
import { formatCurrency, formatDuration } from '@/lib/formatting/formatters';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing, typography } from '@theme/index';
import { ServiceStepItem } from '../components/ServiceStepItem';
import { useService } from '../hooks/useService';

const FALLBACK_STEPS: ServiceStep[] = [
  {
    sortOrder: 1,
    title: 'Tẩy trang & rửa mặt sinh học dịu nhẹ',
    description:
      'Làm sạch sâu bụi bẩn mịn, bã nhờn nhưng giữ trọn màng lipid tự nhiên, an toàn tuyệt đối cho làn da nhạy cảm.',
    durationMinutes: 10,
  },
  {
    sortOrder: 2,
    title: 'Tẩy da chết enzyme & xông thảo dược',
    description:
      'Mở thoáng lỗ chân lông và thanh lọc độc tố bằng hơi nước tinh dầu cúc la mã kết hợp enzyme đu đủ dịu nhẹ.',
    durationMinutes: 10,
  },
  {
    sortOrder: 3,
    title: 'Hút bã nhờn & làm sạch sâu lỗ chân lông',
    description:
      'Sử dụng công nghệ hút chân không áp lực thấp êm ái, gom sạch bã nhờn mà không gây đau rát hay đỏ da.',
    durationMinutes: 15,
  },
  {
    sortOrder: 4,
    title: 'Điện di lạnh tinh chất phục hồi & HA',
    description:
      'Đẩy sâu dưỡng chất vào tầng trung bì với nhiệt độ lạnh -5°C giúp khóa ẩm, làm dịu tức thì và se khít lỗ chân lông.',
    durationMinutes: 20,
  },
  {
    sortOrder: 5,
    title: 'Đắp mặt nạ sinh học & chiếu ánh sáng',
    description:
      'Mặt nạ phục hồi chuyên sâu kết hợp ánh sáng sinh học kích thích tăng sinh collagen và hàng rào bảo vệ tự nhiên.',
    durationMinutes: 20,
  },
];

export function ServiceDetailScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((state) => state.status);

  const { data: service, isLoading, isError, refetch } = useService(serviceId ?? '');

  if (isLoading) {
    return (
      <AppScreen contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText style={styles.loadingText}>Đang tải thông tin dịch vụ...</AppText>
      </AppScreen>
    );
  }

  if (isError || !service) {
    return (
      <AppScreen contentContainerStyle={styles.centerNotice}>
        <AppNotice
          tone="error"
          title="Không tìm thấy dịch vụ"
          message="Dịch vụ bạn đang tìm không tồn tại hoặc đã ngừng cung cấp."
        />
        <View style={styles.backButtonWrap}>
          <AppButton
            title="Quay lại danh sách dịch vụ"
            onPress={() => router.replace('/(public)/services')}
          />
          <AppTextButton title="Thử lại" onPress={() => refetch()} />
        </View>
      </AppScreen>
    );
  }

  const isDiscontinued = service.status === 'discontinued';
  const displaySteps = service.steps && service.steps.length > 0 ? service.steps : FALLBACK_STEPS;

  const handleBooking = () => {
    if (authStatus === 'authenticated') {
      router.push(`/(customer)/bookings`);
    } else {
      router.push(
        `/(public)/login?redirect=${encodeURIComponent(`/(public)/services/${service.id}`)}`,
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
      >
        <View style={styles.heroContainer}>
          {service.imageUrl ? (
            <Image
              source={{ uri: service.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel={service.name}
            />
          ) : (
            <View style={styles.heroFallback}>
              <Sparkles size={56} color={colors.primary} />
            </View>
          )}
          {isDiscontinued && (
            <View style={styles.discontinuedBanner}>
              <AppText style={styles.discontinuedBannerText}>Tạm ngừng phục vụ</AppText>
            </View>
          )}
        </View>

        <View style={styles.bodyContent}>
          {/* Metadata chips */}
          <View style={styles.tagRow}>
            <View style={styles.tagBadge}>
              <Clock size={13} color={colors.primary} />
              <AppText style={styles.tagText}>{formatDuration(service.durationMinutes)}</AppText>
            </View>
            <View style={styles.tagBadge}>
              <Tag size={13} color={colors.muted} />
              <AppText style={styles.tagText}>{service.category}</AppText>
            </View>
            <View style={styles.tagBadge}>
              <Star size={13} color="#df8543" fill="#df8543" />
              <AppText style={styles.tagText}>4.9 (142)</AppText>
            </View>
          </View>

          {/* Title & Short Description */}
          <AppText style={styles.title}>{service.name}</AppText>
          {service.shortDescription && (
            <AppText style={styles.shortDescription}>{service.shortDescription}</AppText>
          )}

          {/* Pricing Box */}
          <View style={styles.pricingCard}>
            <AppText style={styles.priceLabel}>GIÁ LIỆU TRÌNH</AppText>
            <AppText style={styles.price}>{formatCurrency(service.price)}</AppText>
          </View>

          {/* Full Description */}
          {service.description && (
            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Giới thiệu dịch vụ</AppText>
              <AppText style={styles.descriptionText}>{service.description}</AppText>
            </View>
          )}

          {/* Procedure Steps Section */}
          <View style={styles.section}>
            <View style={styles.stepsHeader}>
              <View style={styles.stepsHeaderLeft}>
                <AppText style={styles.sectionTitle}>
                  {`Quy trình ${displaySteps.length} bước chuẩn y khoa`}
                </AppText>
              </View>
              <View style={styles.stepsDurationBadge}>
                <AppText style={styles.stepsDurationText}>
                  {formatDuration(service.durationMinutes)}
                </AppText>
              </View>
            </View>

            <View style={styles.stepsList}>
              {displaySteps.map((step) => (
                <ServiceStepItem key={step.sortOrder} step={step} />
              ))}
            </View>
          </View>

          {/* Policies Card */}
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Chính sách & An toàn</AppText>
            <View style={styles.policyCard}>
              <View style={styles.policyItem}>
                <CheckCircle2 size={16} color={colors.success} />
                <AppText style={styles.policyText}>
                  Vui lòng có mặt trước giờ hẹn 10 phút để được phục vụ tốt nhất.
                </AppText>
              </View>
              <View style={styles.policyItem}>
                <CheckCircle2 size={16} color={colors.success} />
                <AppText style={styles.policyText}>
                  Hỗ trợ đổi lịch hẹn trước tối thiểu 2 giờ hoàn toàn miễn phí.
                </AppText>
              </View>
              <View style={styles.policyItem}>
                <CheckCircle2 size={16} color={colors.success} />
                <AppText style={styles.policyText}>
                  Dụng cụ được khử khuẩn và tiệt trùng đạt chuẩn kiểm định an toàn y tế.
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View
        style={[styles.stickyBottomBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
      >
        <View style={styles.bottomPriceColumn}>
          <AppText style={styles.bottomPriceLabel}>Giá dịch vụ</AppText>
          <AppText style={styles.bottomPriceValue}>{formatCurrency(service.price)}</AppText>
        </View>
        <View style={styles.bottomCtaColumn}>
          <AppButton
            title={isDiscontinued ? 'Tạm ngừng phục vụ' : 'Đặt lịch ngay'}
            onPress={handleBooking}
            disabled={isDiscontinued}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.muted,
    fontSize: typography.body,
  },
  centerNotice: {
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  backButtonWrap: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
    backgroundColor: colors.secondary,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discontinuedBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  discontinuedBannerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: typography.small,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.text,
    fontWeight: 'bold',
  },
  shortDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginTop: -4,
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eee7e1',
    borderRadius: 16,
    padding: spacing.md,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9e948a',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  section: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: 'bold',
    color: colors.text,
  },
  descriptionText: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.text,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  stepsHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  stepsSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  stepsDurationBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  stepsDurationText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  stepsList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  policyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  policyItem: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  policyText: {
    fontSize: typography.small,
    color: colors.muted,
    flex: 1,
  },
  policyIcon: {
    marginTop: spacing.xs
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  bottomPriceColumn: {
    gap: 2,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bottomCtaColumn: {
    width: 160,
  },
});
