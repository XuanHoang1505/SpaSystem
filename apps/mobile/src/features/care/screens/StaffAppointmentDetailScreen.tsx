import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiClientError } from '@spa/api-client';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppLoader } from '@components/common/AppLoader';
import { ErrorState } from '@components/common/ErrorState';
import { AppointmentStatusBadge } from '@/features/bookings/components/AppointmentStatusBadge';
import { colors } from '@/theme/colors';
import { ArrowLeft, Clock, Calendar } from 'lucide-react-native';
import { AllergyHighlightCard } from '../components/AllergyHighlightCard';
import { CustomerCareTab } from '../components/CustomerCareTab';
import { SkinProfileTab } from '../components/SkinProfileTab';
import { CareResultTab } from '../components/CareResultTab';
import { CompleteAppointmentModal } from '../components/CompleteAppointmentModal';
import {
  useCareAppointment,
  useCustomerAllergies,
  useSkinProfile,
} from '../hooks/useStaffAppointmentDetail';
import { useCompleteAppointment } from '../hooks/useCareMutations';
import { formatDisplayDate } from '../utils/careHelpers';

type DetailTab = 'customer' | 'skin_profile' | 'result';

export function StaffAppointmentDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const appointmentId = bookingId ?? '';

  const [activeTab, setActiveTab] = useState<DetailTab>('customer');
  const [completeModalVisible, setCompleteModalVisible] = useState(false);

  const {
    data: appointment,
    isLoading: isLoadingAppointment,
    isError: isErrorAppointment,
    error: appointmentError,
    refetch: refetchAppointment,
  } = useCareAppointment(appointmentId);

  const customerId = appointment?.customer?.id;
  const { data: allergies = [] } = useCustomerAllergies(customerId);

  const hasSkinProfile = Boolean(appointment?.hasSkinProfile || appointment?.skinProfileId);
  const { data: skinProfile } = useSkinProfile(appointmentId, hasSkinProfile);

  const completeMutation = useCompleteAppointment();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(staff)/bookings');
    }
  };

  const handleCompleteAppointment = async (result: string | null) => {
    try {
      const res = await completeMutation.mutateAsync({ id: appointmentId, result });
      let successMsg = 'Đã xác nhận hoàn thành buổi chăm sóc thành công.';
      if (res.packageProgress) {
        const { packageName, usedSessions, totalSessions, status } = res.packageProgress;
        successMsg += `\nGói ${packageName}: Đã dùng ${usedSessions}/${totalSessions} buổi.`;
        if (status === 'completed') {
          successMsg += '\nChúc mừng: Gói liệu trình đã hoàn thành toàn bộ!';
        }
      }
      Alert.alert('Thành công', successMsg);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const code = err.errors[0]?.code;
        if (code === 'complete_too_early') {
          throw new Error('Chưa tới giờ bắt đầu lịch hẹn, chưa thể xác nhận hoàn thành.');
        }
        if (code === 'skin_profile_required') {
          setActiveTab('skin_profile');
          throw new Error('Cần lập hồ sơ da trước khi xác nhận hoàn thành buổi.');
        }
      }
      throw err;
    }
  };

  if (isLoadingAppointment) {
    return (
      <AppScreen scroll={false} style={styles.centerContainer}>
        <AppLoader />
        <AppText style={styles.loadingText}>Đang tải thông tin buổi chăm sóc...</AppText>
      </AppScreen>
    );
  }

  if (isErrorAppointment || !appointment) {
    let title = 'Không thể tải buổi chăm sóc';
    let message = appointmentError instanceof Error ? appointmentError.message : 'Đã có lỗi xảy ra.';

    if (appointmentError instanceof ApiClientError) {
      const code = appointmentError.errors[0]?.code;
      if (code === 'appointment_not_found') {
        title = 'Không tìm thấy lịch hẹn';
        message = 'Lịch hẹn này không tồn tại hoặc đã bị xóa khỏi hệ thống.';
      } else if (code === 'appointment_not_assigned') {
        title = 'Không có quyền truy cập';
        message = 'Lịch hẹn này không được phân công cho bạn.';
      }
    }

    return (
      <AppScreen scroll={false} style={styles.screen}>
        <View style={[styles.navBar, { paddingTop: insets.top + 6 }]}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
        </View>
        <ErrorState
          message={`${title}: ${message}`}
          onRetry={() => {
            refetchAppointment();
          }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false} style={styles.screen}>
      {/* Navigation Bar - edge to edge with proper safe area */}
      <View style={[styles.navBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Quay lại danh sách lịch hẹn"
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText style={styles.navTitle} numberOfLines={1}>
          Chi tiết buổi chăm sóc
        </AppText>
        <View style={styles.navPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Header Card */}
        <View style={styles.topCard}>
          <View style={styles.serviceRow}>
            <AppText style={styles.serviceName}>{appointment.service.name}</AppText>
            <View style={styles.badgeWrapper}>
              <AppointmentStatusBadge status={appointment.status} />
            </View>
          </View>

          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Clock size={15} color={colors.primary} />
              <AppText style={styles.dateTimeText}>
                {appointment.startTime.slice(0, 5)} – {appointment.endTime.slice(0, 5)}
              </AppText>
            </View>
            <View style={styles.dateTimeItem}>
              <Calendar size={15} color={colors.primary} />
              <AppText style={styles.dateTimeText}>{formatDisplayDate(appointment.date)}</AppText>
            </View>
          </View>
        </View>

        {/* Allergy Highlight Card */}
        <AllergyHighlightCard allergies={allergies} />

        {/* Tab Buttons */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('customer')}
            style={[styles.tabButton, activeTab === 'customer' && styles.activeTabButton]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'customer' }}
            accessibilityLabel="Phân đoạn Khách hàng"
          >
            <AppText
              style={[styles.tabButtonText, activeTab === 'customer' && styles.activeTabText]}
            >
              Khách hàng
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('skin_profile')}
            style={[styles.tabButton, activeTab === 'skin_profile' && styles.activeTabButton]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'skin_profile' }}
            accessibilityLabel="Phân đoạn Hồ sơ da"
          >
            <AppText
              style={[styles.tabButtonText, activeTab === 'skin_profile' && styles.activeTabText]}
            >
              Hồ sơ da
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('result')}
            style={[styles.tabButton, activeTab === 'result' && styles.activeTabButton]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'result' }}
            accessibilityLabel="Phân đoạn Kết quả"
          >
            <AppText
              style={[styles.tabButtonText, activeTab === 'result' && styles.activeTabText]}
            >
              Kết quả
            </AppText>
          </Pressable>
        </View>

        {/* Tab Content */}
        {activeTab === 'customer' && (
          <CustomerCareTab appointment={appointment} allergies={allergies} />
        )}

        {activeTab === 'skin_profile' && (
          <SkinProfileTab appointment={appointment} skinProfile={skinProfile} />
        )}

        {activeTab === 'result' && (
          <CareResultTab
            appointment={appointment}
            onOpenCompleteModal={() => setCompleteModalVisible(true)}
          />
        )}
      </ScrollView>

      <CompleteAppointmentModal
        visible={completeModalVisible}
        onClose={() => setCompleteModalVisible(false)}
        hasSkinProfile={hasSkinProfile}
        onConfirm={handleCompleteAppointment}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.muted,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  navPlaceholder: {
    width: 44,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topCard: {
    margin: 16,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
    marginRight: 8,
  },
  badgeWrapper: {
    flexShrink: 0,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    minHeight: 42,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  activeTabText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
