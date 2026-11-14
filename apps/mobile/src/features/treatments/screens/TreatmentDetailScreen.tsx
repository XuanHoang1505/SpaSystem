import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import type { MyTreatmentSession } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { colors, shadows, spacing } from '@theme/index';
import { TreatmentOverviewCard } from '../components/TreatmentOverviewCard';
import { TreatmentSessionDetailModal } from '../components/TreatmentSessionDetailModal';
import { TreatmentSessionTimeline } from '../components/TreatmentSessionTimeline';
import { useMyTreatmentPlan } from '../hooks/useMyTreatmentPlan';
import { classifyTreatmentError } from '../utils/treatmentHelpers';

export function TreatmentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { treatmentId } = useLocalSearchParams<{ treatmentId?: string }>();
  const [selectedSession, setSelectedSession] = useState<MyTreatmentSession | null>(null);

  const { data: plan, isLoading, isError, error, refetch } = useMyTreatmentPlan(treatmentId);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/treatments');
    }
  };

  if (isLoading) {
    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <AppText style={styles.headerTitle}>Phác đồ liệu trình</AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải phác đồ liệu trình...</AppText>
        </View>
      </AppScreen>
    );
  }

  if (isError || !plan) {
    const classified = classifyTreatmentError(error);
    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <AppText style={styles.headerTitle}>Phác đồ liệu trình</AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorWrap}>
          <AppNotice
            tone="error"
            title={
              classified.kind === 'not_found' ? 'Không tìm thấy liệu trình' : 'Lỗi tải liệu trình'
            }
            message={classified.message}
          />
          {classified.kind === 'not_found' ? (
            <AppButton
              title="Về danh sách liệu trình"
              onPress={() => router.replace('/(customer)/treatments')}
            />
          ) : (
            <AppButton title="Thử lại" onPress={() => refetch()} />
          )}
        </View>
      </AppScreen>
    );
  }

  const canBookNext = Boolean(plan.nextSession?.canBook);
  const showStatusNotice = plan.status === 'paused' || plan.status === 'cancelled';

  const handleBookSessionId = (sessionId: string) => {
    router.push(
      `/booking/new?treatmentSessionId=${encodeURIComponent(
        sessionId,
      )}&treatmentPlanId=${encodeURIComponent(plan.id)}`,
    );
  };

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Standalone Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText style={styles.headerTitle}>Phác đồ liệu trình</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.xl + insets.bottom + 84 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Reason Warning / Error Banner */}
        {showStatusNotice && (
          <AppNotice
            tone={plan.status === 'paused' ? 'warning' : 'error'}
            title={plan.status === 'paused' ? 'Liệu trình đang tạm dừng' : 'Liệu trình đã hủy'}
            message={plan.statusReason ?? 'Liệu trình này hiện không thể đặt thêm buổi hẹn mới.'}
          />
        )}

        {/* Overview Card */}
        <TreatmentOverviewCard
          plan={plan}
          onPressViewPackage={(customerPackageId) =>
            router.push(`/my-packages/${customerPackageId}`)
          }
        />

        {/* Sessions Timeline */}
        <TreatmentSessionTimeline
          sessions={plan.sessions}
          onPressBookSession={(session) => handleBookSessionId(session.id)}
          onPressViewAppointment={(appointmentId) => router.push(`/booking/${appointmentId}`)}
          onPressViewNote={(session) => setSelectedSession(session)}
        />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      {canBookNext && plan.nextSession && (
        <View
          style={[styles.stickyBottomBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
        >
          <View style={styles.stickyInfoCol}>
            <AppText style={styles.stickyLabel}>Buổi kế tiếp</AppText>
            <AppText style={styles.stickyValue} numberOfLines={1}>
              Buổi {plan.nextSession.sequenceNumber}: {plan.nextSession.serviceName}
            </AppText>
          </View>
          <View style={styles.stickyBtnWrap}>
            <AppButton
              title={`Đặt lịch buổi tiếp theo (Buổi ${plan.nextSession.sequenceNumber})`}
              variant="primary"
              onPress={() => handleBookSessionId(plan.nextSession!.id)}
            />
          </View>
        </View>
      )}

      {/* Session Result Modal */}
      <TreatmentSessionDetailModal
        visible={Boolean(selectedSession)}
        treatmentId={plan.id}
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
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
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  headerSpacer: {
    width: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  stickyBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  stickyInfoCol: {
    flex: 0.9,
    gap: 2,
  },
  stickyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  stickyValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  stickyBtnWrap: {
    flex: 1.35,
  },
});
