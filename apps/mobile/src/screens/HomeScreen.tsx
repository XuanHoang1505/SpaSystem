import { useMemo } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Search,
  ShoppingCart,
  Sparkles,
  User,
} from 'lucide-react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { colors } from '@theme/index';
import { useMyAppointments } from '@/features/bookings';
import { useCart } from '@/features/orders';
import { usePackageSearch } from '@/features/packages';
import { useServiceCategories, useServiceSearch } from '@/features/services';
import { formatCurrency, formatLocalTime } from '@/lib/formatting/formatters';
import { useAuthStore } from '@/stores/authStore';

const FALLBACK_IMAGES = {
  facial:
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80',
  massage:
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
  hairSpa:
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
  bodyCare:
    'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=600&q=80',
  packageStone:
    'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=600&q=80',
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-facial', name: 'Chăm sóc\nda mặt', image: FALLBACK_IMAGES.facial },
  { id: 'cat-massage', name: 'Massage\ntrị liệu', image: FALLBACK_IMAGES.massage },
  { id: 'cat-hair', name: 'Gội đầu\ndưỡng sinh', image: FALLBACK_IMAGES.hairSpa },
  { id: 'cat-body', name: 'Tắm trắng &\nBody', image: FALLBACK_IMAGES.bodyCare },
];

function getCategoryImage(name: string, index: number): string {
  const lower = name.toLowerCase();
  if (lower.includes('mặt') || lower.includes('da')) return FALLBACK_IMAGES.facial;
  if (lower.includes('massage') || lower.includes('cổ') || lower.includes('đá'))
    return FALLBACK_IMAGES.massage;
  if (lower.includes('gội') || lower.includes('tóc')) return FALLBACK_IMAGES.hairSpa;
  if (lower.includes('tắm') || lower.includes('body')) return FALLBACK_IMAGES.bodyCare;
  const pool = [
    FALLBACK_IMAGES.facial,
    FALLBACK_IMAGES.massage,
    FALLBACK_IMAGES.hairSpa,
    FALLBACK_IMAGES.bodyCare,
  ];
  return pool[index % pool.length]!;
}

function getGreetingByVnHour(): string {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    hour12: false,
  }).format(new Date());
  const hour = Number.parseInt(hourStr, 10);
  if (hour < 12) return 'Chào buổi sáng,';
  if (hour < 18) return 'Chào buổi chiều,';
  return 'Chào buổi tối,';
}

function formatVietnameseDateWithWeekday(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return dateStr;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const wdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const wday = wdays[dateObj.getUTCDay()] ?? '';
  return `${wday}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Decorative Botanical Leaves Background rendered via react-native-svg.
 */
function BotanicalBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Soft watercolor aura top-right */}
      <View style={styles.watercolorTopRight} />
      <View style={styles.watercolorMidRight} />

      {/* Top-right hanging olive leaves */}
      <Svg width={190} height={130} viewBox="0 0 190 130" style={styles.svgTopLeaves}>
        <G opacity={0.35}>
          {/* Main stem */}
          <Path d="M40 -10 Q95 35 160 20" stroke={colors.leaf} strokeWidth={1.8} fill="none" />
          {/* Hanging leaves */}
          <Path d="M45 0 C32 24 34 46 44 64 C54 46 56 24 45 0 Z" fill={colors.leafLight} />
          <Path d="M72 8 C56 34 56 60 66 84 C78 60 82 34 72 8 Z" fill={colors.leaf} />
          <Path d="M100 14 C88 38 92 64 104 82 C112 60 112 36 100 14 Z" fill={colors.leafLight} />
          <Path d="M128 16 C122 36 130 56 144 68 C146 48 140 30 128 16 Z" fill={colors.leaf} />
          <Path d="M150 14 C154 30 166 42 182 48 C178 32 166 20 150 14 Z" fill={colors.leafLight} />
        </G>
      </Svg>

      {/* Right-edge peeking branch near Search & Upcoming card */}
      <Svg width={120} height={170} viewBox="0 0 120 170" style={styles.svgRightBranch}>
        <G opacity={0.28}>
          <Path d="M130 95 Q65 85 15 55" stroke={colors.leaf} strokeWidth={1.8} fill="none" />
          <Path d="M55 72 C32 56 14 54 2 62 C18 74 38 78 55 72 Z" fill={colors.leaf} />
          <Path d="M78 82 C54 62 34 52 18 52 C32 70 54 82 78 82 Z" fill={colors.leafLight} />
          <Path d="M84 90 C56 90 32 100 16 114 C40 114 66 104 84 90 Z" fill={colors.leaf} />
          <Path d="M105 94 C80 104 60 120 48 138 C72 132 94 114 105 94 Z" fill={colors.leafLight} />
        </G>
      </Svg>
    </View>
  );
}

function LotusLogo() {
  return (
    <Svg width={42} height={34} viewBox="0 0 48 38">
      {/* Outer side petals */}
      <Path
        d="M24 32 C10 32 3 23 4 15 C11 16 18 22 24 32 Z"
        fill={colors.secondary}
        stroke={colors.primary}
        strokeWidth={1.6}
      />
      <Path
        d="M24 32 C38 32 45 23 44 15 C37 16 30 22 24 32 Z"
        fill={colors.secondary}
        stroke={colors.primary}
        strokeWidth={1.6}
      />
      {/* Mid petals */}
      <Path
        d="M24 32 C14 27 10 16 13 8 C20 12 23 20 24 32 Z"
        fill={colors.primarySoft}
        stroke={colors.primary}
        strokeWidth={1.6}
      />
      <Path
        d="M24 32 C34 27 38 16 35 8 C28 12 25 20 24 32 Z"
        fill={colors.primarySoft}
        stroke={colors.primary}
        strokeWidth={1.6}
      />
      {/* Center petal */}
      <Path
        d="M24 32 C17 22 17 11 24 3 C31 11 31 22 24 32 Z"
        fill={colors.card}
        stroke={colors.primary}
        strokeWidth={1.7}
      />
    </Svg>
  );
}

function QuickActionBookingIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 40 40">
      <Rect x={5} y={8} width={26} height={24} rx={5} fill={colors.primary} />
      <Path d="M5 14 H31 V27 A5 5 0 0 1 26 32 H10 A5 5 0 0 1 5 27 Z" fill={colors.leaf} />
      <Rect x={11} y={4} width={3} height={7} rx={1.5} fill={colors.primaryPressed} />
      <Rect x={22} y={4} width={3} height={7} rx={1.5} fill={colors.primaryPressed} />
      <Circle cx={12} cy={20} r={1.6} fill={colors.card} />
      <Circle cx={18} cy={20} r={1.6} fill={colors.card} />
      <Circle cx={24} cy={20} r={1.6} fill={colors.card} />
      <Circle cx={12} cy={25} r={1.6} fill={colors.card} />
      <Circle cx={18} cy={25} r={1.6} fill={colors.card} />
      <Circle
        cx={29}
        cy={29}
        r={7.5}
        fill={colors.primaryPressed}
        stroke={colors.card}
        strokeWidth={1.8}
      />
      <Path
        d="M29 25.5 V32.5 M25.5 29 H32.5"
        stroke={colors.card}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function QuickActionSparklesIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 40 40">
      <Path d="M16 6 Q16 16 6 16 Q16 16 16 26 Q16 16 26 16 Q16 16 16 6 Z" fill={colors.primary} />
      <Path
        d="M29 14 Q29 21 22 21 Q29 21 29 28 Q29 21 36 21 Q29 21 29 14 Z"
        fill={colors.leafLight}
      />
      <Path
        d="M19 23 Q19 29 13 29 Q19 29 19 35 Q19 29 25 29 Q19 29 19 23 Z"
        fill={colors.primaryPressed}
      />
    </Svg>
  );
}

function QuickActionGiftIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 40 40">
      <Rect x={7} y={17} width={26} height={17} rx={3.5} fill={colors.leaf} />
      <Rect x={5} y={12} width={30} height={6} rx={2.5} fill={colors.primaryPressed} />
      <Rect x={18} y={12} width={4} height={22} fill={colors.primarySoft} />
      <Rect x={7} y={23} width={26} height={3.5} fill={colors.primarySoft} />
      <Path d="M20 12 C14 12 12 6 16 6 C19 6 20 10 20 12 Z" fill={colors.primary} />
      <Path d="M20 12 C26 12 28 6 24 6 C21 6 20 10 20 12 Z" fill={colors.primary} />
    </Svg>
  );
}

function QuickActionAiIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 40 40">
      <Ellipse cx={20} cy={22} rx={13} ry={11} fill={colors.secondary} />
      <Rect x={10} y={15} width={20} height={12} rx={6} fill={colors.primaryPressed} />
      <Circle cx={15.5} cy={21} r={2.2} fill={colors.card} />
      <Circle cx={24.5} cy={21} r={2.2} fill={colors.card} />
      <Path
        d="M17.5 24.2 Q20 26 22.5 24.2"
        stroke={colors.card}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x={19} y={7} width={2} height={4} fill={colors.leaf} />
      <Circle cx={20} cy={6.5} r={2} fill={colors.leaf} />
      <Circle cx={30} cy={29} r={6.5} fill={colors.primarySoft} />
      <Path
        d="M30 32.5 C30 32.5 25.5 29.5 25.5 27.2 C25.5 25.8 26.7 24.8 28 24.8 C29 24.8 29.7 25.4 30 26.1 C30.3 25.4 31 24.8 32 24.8 C33.3 24.8 34.5 25.8 34.5 27.2 C34.5 29.5 30 32.5 30 32.5 Z"
        fill={colors.primary}
      />
    </Svg>
  );
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = status === 'authenticated' && Boolean(user);

  const greeting = useMemo(() => getGreetingByVnHour(), []);

  const categoriesQuery = useServiceCategories();
  const servicesQuery = useServiceSearch({ pageNumber: 1, pageSize: 6 });
  const packagesQuery = usePackageSearch({ pageNumber: 1, pageSize: 4 });
  const appointmentsQuery = useMyAppointments({
    scope: 'upcoming',
    pageNumber: 1,
    pageSize: 1,
  });
  const cartQuery = useCart();

  const upcomingAppointment = appointmentsQuery.data?.items?.[0] ?? null;
  const cartCount = isAuthenticated ? (cartQuery.data?.items?.length ?? 0) : 0;

  const categories = useMemo(() => {
    const apiCats = categoriesQuery.data ?? [];
    if (apiCats.length === 0) return DEFAULT_CATEGORIES;
    return apiCats.slice(0, 6).map((c, idx) => ({
      id: c.id,
      name: c.name,
      image: getCategoryImage(c.name, idx),
    }));
  }, [categoriesQuery.data]);

  const services = servicesQuery.data?.items ?? [];
  const packages = packagesQuery.data?.items ?? [];

  const isRefreshing =
    categoriesQuery.isRefetching ||
    servicesQuery.isRefetching ||
    packagesQuery.isRefetching ||
    (isAuthenticated && appointmentsQuery.isRefetching);

  const handleRefresh = () => {
    void categoriesQuery.refetch();
    void servicesQuery.refetch();
    void packagesQuery.refetch();
    if (isAuthenticated) {
      void appointmentsQuery.refetch();
      void cartQuery.refetch();
    }
  };

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <BotanicalBackground />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: 28 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* 1. Top Brand & Greeting Header */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <LotusLogo />
            <View>
              <AppText style={styles.brandLine1}>NHƯ NGUYỆT</AppText>
              <AppText style={styles.brandLine2}>SPA</AppText>
              {/* Hidden full text for screen readers & tests */}
              <AppText style={styles.srOnly}>NHƯ NGUYỆT SPA</AppText>
            </View>
          </View>

          <View style={styles.greetingBox}>
            <AppText style={styles.greetingSub}>{greeting}</AppText>
            <AppText style={styles.greetingName} numberOfLines={1}>
              {user?.fullName ? `${user.fullName} ☀️` : 'Quý khách ☀️'}
            </AppText>
          </View>

          <Pressable
            onPress={() =>
              isAuthenticated ? router.push('/cart') : router.push('/(public)/login?redirect=/cart')
            }
            accessibilityRole="button"
            accessibilityLabel={`Giỏ hàng, ${cartCount} sản phẩm`}
            hitSlop={8}
            style={styles.cartBtn}
          >
            <ShoppingCart size={23} color={colors.text} />
            <View style={styles.cartBadge}>
              <AppText style={styles.cartBadgeText}>
                {cartCount > 99 ? '99+' : String(cartCount)}
              </AppText>
            </View>
          </Pressable>
        </View>

        {/* 2. Search Bar */}
        <Pressable
          onPress={() => router.push('/(public)/services')}
          accessibilityRole="search"
          accessibilityLabel="Tìm dịch vụ chăm sóc da, massage, gói liệu trình"
          style={styles.searchBar}
        >
          <Search size={18} color={colors.muted} />
          <AppText style={styles.searchPlaceholder} numberOfLines={1}>
            Tìm dịch vụ chăm sóc da, massage, gói liệu trình...
          </AppText>
        </Pressable>

        {/* 3. Upcoming Appointment Card (Soft Green) */}
        <View style={styles.upcomingCard}>
          <View style={styles.upcomingHeader}>
            <View style={styles.upcomingTitleRow}>
              <View style={styles.greenCalendarBadge}>
                <Calendar size={14} color={colors.primary} />
              </View>
              <AppText style={styles.upcomingTitle}>Lịch hẹn sắp tới</AppText>
            </View>

            <View style={styles.confirmedPill}>
              <CheckCircle2 size={13} color={colors.primary} />
              <AppText style={styles.confirmedPillText}>
                {upcomingAppointment
                  ? upcomingAppointment.status === 'held'
                    ? 'Đang giữ chỗ'
                    : 'Đã xác nhận'
                  : isAuthenticated
                    ? 'Sẵn sàng đặt lịch'
                    : 'Thành viên Spa'}
              </AppText>
            </View>
          </View>

          <View style={styles.upcomingBody}>
            <Image source={{ uri: FALLBACK_IMAGES.facial }} style={styles.upcomingThumb} />

            <View style={styles.upcomingInfo}>
              {upcomingAppointment ? (
                <Pressable
                  onPress={() => router.push(`/booking/${upcomingAppointment.id}`)}
                  style={styles.upcomingDetailsPress}
                >
                  <View style={styles.upcomingTextCol}>
                    <View style={styles.infoLine}>
                      <Calendar size={13} color={colors.text} />
                      <AppText style={styles.infoDateText} numberOfLines={1}>
                        {formatVietnameseDateWithWeekday(upcomingAppointment.date)} ·{' '}
                        {formatLocalTime(upcomingAppointment.startTime)}
                      </AppText>
                    </View>
                    <View style={styles.infoLine}>
                      <Sparkles size={13} color={colors.primary} />
                      <AppText style={styles.infoServiceText} numberOfLines={1}>
                        {upcomingAppointment.service.name}
                      </AppText>
                    </View>
                    <View style={styles.infoLine}>
                      <User size={13} color={colors.muted} />
                      <AppText style={styles.infoStaffText} numberOfLines={1}>
                        KTV. {upcomingAppointment.staff.fullName}
                      </AppText>
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() =>
                    isAuthenticated
                      ? router.push('/(customer)/bookings')
                      : router.push('/(public)/login')
                  }
                  style={styles.upcomingDetailsPress}
                >
                  <View style={styles.upcomingTextCol}>
                    <View style={styles.infoLine}>
                      <Calendar size={13} color={colors.text} />
                      <AppText style={styles.infoDateText} numberOfLines={1}>
                        {isAuthenticated
                          ? 'Chưa có lịch hẹn sắp tới'
                          : 'Đặt lịch nhanh & giữ chỗ tự động'}
                      </AppText>
                    </View>
                    <View style={styles.infoLine}>
                      <Sparkles size={13} color={colors.primary} />
                      <AppText style={styles.infoServiceText} numberOfLines={1}>
                        Chăm sóc da mặt & trị liệu chuyên sâu
                      </AppText>
                    </View>
                    <View style={styles.infoLine}>
                      <User size={13} color={colors.muted} />
                      <AppText style={styles.infoStaffText} numberOfLines={1}>
                        Chọn khung giờ & KTV yêu thích
                      </AppText>
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.muted} />
                </Pressable>
              )}

              <View style={styles.upcomingActions}>
                {upcomingAppointment ? (
                  <>
                    <Pressable
                      onPress={() => router.push(`/booking/${upcomingAppointment.id}`)}
                      accessibilityRole="button"
                      style={styles.btnOutlineGreen}
                    >
                      <AppText style={styles.btnOutlineGreenText}>Xem chi tiết</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        upcomingAppointment.status === 'held'
                          ? router.push(`/booking/${upcomingAppointment.id}`)
                          : router.push('/(customer)/bookings')
                      }
                      accessibilityRole="button"
                      style={styles.btnFilledGreen}
                    >
                      <AppText style={styles.btnFilledGreenText}>
                        {upcomingAppointment.status === 'held' ? 'Thanh toán' : 'Quản lý lịch'}
                      </AppText>
                    </Pressable>
                  </>
                ) : isAuthenticated ? (
                  <>
                    <Pressable
                      onPress={() => router.push('/(customer)/bookings')}
                      accessibilityRole="button"
                      style={styles.btnOutlineGreen}
                    >
                      <AppText style={styles.btnOutlineGreenText}>Xem lịch hẹn</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push('/(public)/services')}
                      accessibilityRole="button"
                      style={styles.btnFilledGreen}
                    >
                      <AppText style={styles.btnFilledGreenText}>Đặt lịch ngay</AppText>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      onPress={() => router.push('/(public)/register')}
                      accessibilityRole="button"
                      style={styles.btnOutlineGreen}
                    >
                      <AppText style={styles.btnOutlineGreenText}>Đăng ký</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push('/(public)/login')}
                      accessibilityRole="button"
                      style={styles.btnFilledGreen}
                    >
                      <AppText style={styles.btnFilledGreenText}>Đăng nhập</AppText>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 4. Quick Actions (4 Squircle Cards) */}
        <View style={styles.quickActionsRow}>
          <Pressable
            onPress={() => router.push('/(public)/services')}
            accessibilityRole="button"
            style={styles.quickCard}
          >
            <QuickActionBookingIcon />
            <AppText style={styles.quickLabel}>Đặt lịch hẹn</AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(public)/services')}
            accessibilityRole="button"
            style={styles.quickCard}
          >
            <QuickActionSparklesIcon />
            <AppText style={styles.quickLabel}>Dịch vụ lẻ</AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(public)/packages')}
            accessibilityRole="button"
            style={styles.quickCard}
          >
            <QuickActionGiftIcon />
            <AppText style={styles.quickLabel}>Gói liệu trình</AppText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(customer)/ai-assistant')}
            accessibilityRole="button"
            style={styles.quickCard}
          >
            <QuickActionAiIcon />
            <AppText style={styles.quickLabel}>Tư vấn AI</AppText>
          </Pressable>
        </View>

        {/* 5. Explore by Categories */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M17 3 C10 3 4 8 4 16 C4 18 5 20 5 20 C5 20 14 20 18 14 C21 9 20 4 17 3 Z"
                  fill={colors.primary}
                />
                <Path
                  d="M5 20 Q11 14 16 8"
                  stroke={colors.card}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
              <AppText style={styles.sectionTitle}>Khám phá theo danh mục</AppText>
            </View>

            <Pressable
              onPress={() => router.push('/(public)/services')}
              accessibilityRole="button"
              style={styles.seeAllBtn}
            >
              <AppText style={styles.seeAllText}>Xem tất cả</AppText>
              <ArrowRight size={13} color={colors.primary} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() =>
                  cat.id.startsWith('cat-')
                    ? router.push('/(public)/services')
                    : router.push(`/(public)/services?categoryId=${cat.id}`)
                }
                accessibilityRole="button"
                style={styles.categoryCard}
              >
                <Image source={{ uri: cat.image }} style={styles.categoryImage} />
                <View style={styles.categoryLabelWrap}>
                  <AppText style={styles.categoryLabel} numberOfLines={2}>
                    {cat.name}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 6. Featured Services */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M12 21 C12 21 3 14.5 3 8.5 C3 5.5 5.4 3.2 8.3 3.2 C10.1 3.2 11.4 4.1 12 5.3 C12.6 4.1 13.9 3.2 15.7 3.2 C18.6 3.2 21 5.5 21 8.5 C21 14.5 12 21 12 21 Z"
                  fill={colors.primary}
                />
              </Svg>
              <AppText style={styles.sectionTitle}>Dịch vụ được yêu thích</AppText>
            </View>

            <Pressable
              onPress={() => router.push('/(public)/services')}
              accessibilityRole="button"
              style={styles.seeAllBtn}
            >
              <AppText style={styles.seeAllText}>Xem tất cả</AppText>
              <ArrowRight size={13} color={colors.primary} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {services.map((srv, idx) => (
              <Pressable
                key={srv.id}
                onPress={() => router.push(`/(public)/services/${srv.id}`)}
                style={styles.serviceCard}
              >
                <Image
                  source={{
                    uri: srv.imageUrl || getCategoryImage(srv.name, idx),
                  }}
                  style={styles.serviceImage}
                />
                <View style={styles.serviceBody}>
                  <AppText style={styles.serviceName} numberOfLines={2}>
                    {srv.name}
                  </AppText>
                  <View style={styles.durationRow}>
                    <Clock size={12} color={colors.muted} />
                    <AppText style={styles.durationText}>{srv.durationMinutes} phút</AppText>
                  </View>
                  <AppText style={styles.servicePrice}>{formatCurrency(srv.price)}</AppText>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      const bookingUrl = `/booking/new?serviceId=${srv.id}`;
                      if (isAuthenticated) {
                        router.push(bookingUrl);
                      } else {
                        router.push(
                          `/(public)/login?redirect=${encodeURIComponent(bookingUrl)}`,
                        );
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Đặt lịch ${srv.name}`}
                    style={styles.serviceBookBtn}
                  >
                    <AppText style={styles.serviceBookBtnText}>Đặt lịch</AppText>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 7. Promotional Treatment Packages */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Rect x={3} y={10} width={18} height={11} rx={2} fill={colors.primary} />
                <Rect x={2} y={6} width={20} height={4} rx={1.5} fill={colors.leaf} />
                <Rect x={11} y={6} width={2} height={15} fill={colors.card} />
              </Svg>
              <AppText style={styles.sectionTitle}>Gói liệu trình ưu đãi</AppText>
            </View>

            <Pressable
              onPress={() => router.push('/(public)/packages')}
              accessibilityRole="button"
              style={styles.seeAllBtn}
            >
              <AppText style={styles.seeAllText}>Xem tất cả</AppText>
              <ArrowRight size={13} color={colors.primary} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {packages.map((pkg, idx) => {
              // Real savings against buying every session separately (retailPrice from the API).
              const hasSavings = pkg.retailPrice > pkg.price;
              const discountPct = hasSavings
                ? Math.round(((pkg.retailPrice - pkg.price) / pkg.retailPrice) * 100)
                : 0;

              return (
                <Pressable
                  key={pkg.id}
                  onPress={() => router.push(`/(public)/packages/${pkg.id}`)}
                  style={styles.packageCard}
                >
                  <Image
                    source={{
                      uri:
                        pkg.imageUrl ||
                        (idx % 2 === 0 ? FALLBACK_IMAGES.packageStone : FALLBACK_IMAGES.facial),
                    }}
                    style={styles.packageImage}
                  />

                  <View style={styles.packageContent}>
                    {discountPct > 0 ? (
                      <View style={styles.packageBadgeRow}>
                        <View style={styles.discountBadge}>
                          <AppText style={styles.discountBadgeText}>
                            Tiết kiệm {discountPct}%
                          </AppText>
                        </View>
                      </View>
                    ) : null}

                    <AppText style={styles.packageName} numberOfLines={1}>
                      {pkg.name}
                    </AppText>

                    <View style={styles.durationRow}>
                      <Clock size={11} color={colors.muted} />
                      <AppText style={styles.packageMetaText}>
                        {pkg.totalSessions} buổi · Hạn {pkg.validityDays} ngày
                      </AppText>
                    </View>

                    <View style={styles.packagePriceRow}>
                      <AppText style={styles.packageSalePrice}>{formatCurrency(pkg.price)}</AppText>
                      {hasSavings ? (
                        <AppText style={styles.packageOldPrice}>
                          {formatCurrency(pkg.retailPrice)}
                        </AppText>
                      ) : null}
                    </View>

                    <Pressable
                      onPress={() => router.push(`/(public)/packages/${pkg.id}`)}
                      accessibilityRole="button"
                      style={styles.packageCtaBtn}
                    >
                      <AppText style={styles.packageCtaText}>Xem gói</AppText>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 0,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  watercolorTopRight: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.secondary,
    opacity: 0.55,
  },
  watercolorMidRight: {
    position: 'absolute',
    top: 110,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.primarySoft,
    opacity: 0.5,
  },
  svgTopLeaves: {
    position: 'absolute',
    top: -6,
    right: 12,
  },
  svgRightBranch: {
    position: 'absolute',
    top: 90,
    right: -8,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLine1: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryPressed,
    letterSpacing: 0.6,
    lineHeight: 15,
  },
  brandLine2: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    lineHeight: 14,
  },
  greetingBox: {
    flex: 1,
    paddingLeft: 6,
  },
  greetingSub: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  greetingName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 20,
  },
  cartBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accentRose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onPrimary,
    lineHeight: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: colors.muted,
  },
  upcomingCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: colors.primaryPressed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  greenCalendarBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryPressed,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  confirmedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  upcomingBody: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  upcomingThumb: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: colors.secondary,
  },
  upcomingInfo: {
    flex: 1,
    gap: 10,
  },
  upcomingDetailsPress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  upcomingTextCol: {
    flex: 1,
    gap: 4,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoDateText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.text,
  },
  infoServiceText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  infoStaffText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
  },
  upcomingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  btnOutlineGreen: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  btnOutlineGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  btnFilledGreen: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  btnFilledGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  quickLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  horizontalScroll: {
    gap: 10,
    paddingRight: 8,
  },
  categoryCard: {
    width: 92,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
  },
  categoryImage: {
    width: '100%',
    height: 58,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  categoryLabelWrap: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  categoryLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
  },
  serviceCard: {
    width: 150,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: 92,
    backgroundColor: colors.surface,
  },
  serviceBody: {
    padding: 10,
    gap: 4,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 17,
    minHeight: 34,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 11.5,
    color: colors.muted,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  serviceBookBtn: {
    marginTop: 4,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  serviceBookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  packageCard: {
    width: 280,
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 9,
    gap: 10,
    alignItems: 'center',
  },
  packageImage: {
    width: 84,
    height: 112,
    borderRadius: 12,
    backgroundColor: colors.secondary,
  },
  packageContent: {
    flex: 1,
    gap: 3,
  },
  packageBadgeRow: {
    alignItems: 'flex-end',
  },
  discountBadge: {
    backgroundColor: colors.accentRose,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  packageName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  packageMetaText: {
    fontSize: 11,
    color: colors.muted,
  },
  packagePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 1,
  },
  packageSalePrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primaryPressed,
  },
  packageOldPrice: {
    fontSize: 10.5,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  packageCtaBtn: {
    marginTop: 4,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageCtaText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
