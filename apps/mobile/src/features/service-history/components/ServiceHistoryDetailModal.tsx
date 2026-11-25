import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Package,
  Receipt,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';
import { useServiceHistoryDetail } from '../hooks/useServiceHistoryDetail';
import { formatServiceHistoryDate, getServiceHistoryStatusMeta } from '../utils/historyStatus';

export interface ServiceHistoryDetailModalProps {
  visible: boolean;
  appointmentId: string | null;
  onClose: () => void;
}

export function ServiceHistoryDetailModal({
  visible,
  appointmentId,
  onClose,
}: ServiceHistoryDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useServiceHistoryDetail(
    appointmentId,
    visible && Boolean(appointmentId),
  );

  const statusMeta = data ? getServiceHistoryStatusMeta(data.status) : null;

  const handleReview = () => {
    onClose();
    router.push('/my-reviews');
  };

  const handleViewTreatment = (planId: string) => {
    onClose();
    router.push(`/treatment/${encodeURIComponent(planId)}`);
  };

  const handleViewOrder = (orderId: string) => {
    onClose();
    router.push(`/my-orders/${encodeURIComponent(orderId)}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <FileText size={18} color={colors.primary} />
              <AppText style={styles.headerTitle}>Chi tiết lần sử dụng</AppText>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng chi tiết"
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText style={styles.loadingText}>Đang tải chi tiết lần sử dụng...</AppText>
            </View>
          ) : isError ? (
            <View style={styles.errorBox}>
              <AppNotice
                tone="error"
                title="Không tải được chi tiết"
                message="Đã có lỗi xảy ra khi tải thông tin lần sử dụng. Vui lòng thử lại."
              />
              <AppButton title="Thử lại" onPress={() => refetch()} />
            </View>
          ) : data ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Service Title & Status */}
              <View style={styles.titleSection}>
                <View style={styles.titleRow}>
                  <AppText style={styles.serviceTitle}>{data.serviceName}</AppText>
                  {statusMeta && (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusMeta.backgroundColor,
                          borderColor: statusMeta.borderColor,
                        },
                      ]}
                    >
                      <AppText style={[styles.statusBadgeText, { color: statusMeta.textColor }]}>
                        {statusMeta.label}
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText style={styles.durationText}>
                  Thời lượng dự kiến: {data.durationMinutes} phút
                </AppText>
              </View>

              {/* Time & Staff Card */}
              <View style={[styles.infoCard, styles.timeCard]}>
                <View style={styles.cardRow}>
                  <Calendar size={16} color={colors.primary} />
                  <AppText style={styles.cardTextBold}>
                    {formatServiceHistoryDate(data.date)} lúc {data.startTime} – {data.endTime}
                  </AppText>
                </View>
                <View style={styles.cardRow}>
                  <User size={16} color={colors.primary} />
                  <AppText style={styles.cardText}>
                    Kỹ thuật viên phụ trách:{' '}
                    <AppText style={styles.cardTextBold}>{data.staff.fullName}</AppText>
                  </AppText>
                </View>
              </View>

              {/* Source Information */}
              <View style={styles.infoCard}>
                <AppText style={styles.sectionHeader}>NGUỒN DỊCH VỤ</AppText>
                {data.source === 'package' ? (
                  <View style={styles.sourceContent}>
                    <View style={styles.cardRow}>
                      <Package size={16} color={colors.primary} />
                      <AppText style={styles.cardTextBold}>
                        {data.packageName}
                        {data.sequenceNumber != null ? ` · Buổi thứ ${data.sequenceNumber}` : ''}
                      </AppText>
                    </View>
                    {data.treatmentPlanId && (
                      <Pressable
                        style={styles.linkButton}
                        onPress={() => handleViewTreatment(data.treatmentPlanId!)}
                        accessibilityRole="button"
                        accessibilityLabel="Xem phác đồ liệu trình"
                      >
                        <AppText style={styles.linkButtonText}>
                          Xem phác đồ & nhật ký liệu trình
                        </AppText>
                        <ExternalLink size={14} color={colors.primary} />
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <View style={styles.cardRow}>
                    <Sparkles size={16} color={colors.primary} />
                    <AppText style={styles.cardText}>Dịch vụ lẻ độc lập</AppText>
                  </View>
                )}
              </View>

              {/* Care Result */}
              <View style={styles.infoCard}>
                <AppText style={styles.sectionHeader}>KẾT QUẢ CHĂM SÓC</AppText>
                {data.status === 'completed' ? (
                  data.result ? (
                    <View style={styles.resultBox}>
                      <CheckCircle2 size={16} color={colors.success} style={styles.resultIcon} />
                      <AppText style={styles.resultText}>{data.result}</AppText>
                    </View>
                  ) : (
                    <AppText style={styles.emptyResultText}>
                      Kỹ thuật viên chưa ghi chú thêm kết quả chăm sóc.
                    </AppText>
                  )
                ) : (
                  <View style={styles.noShowBox}>
                    <AlertTriangle size={16} color={colors.error} style={styles.resultIcon} />
                    <AppText style={styles.noShowText}>
                      Khách hàng không đến theo lịch hẹn đã xác nhận.
                    </AppText>
                  </View>
                )}
              </View>

              {/* Order Information */}
              {data.order && (
                <View style={styles.infoCard}>
                  <AppText style={styles.sectionHeader}>HÓA ĐƠN ĐƠN HÀNG</AppText>
                  <View style={styles.orderRow}>
                    <View style={styles.orderCodeRow}>
                      <Receipt size={16} color={colors.primary} />
                      <AppText style={styles.orderCodeText}>Mã: {data.order.code}</AppText>
                    </View>
                    <Pressable
                      style={styles.orderLink}
                      onPress={() => handleViewOrder(data.order!.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Xem chi tiết đơn hàng"
                    >
                      <AppText style={styles.orderLinkText}>Xem đơn</AppText>
                      <ExternalLink size={13} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionSection}>
                {data.status === 'completed' && (
                  <AppButton
                    title="Đánh giá dịch vụ"
                    onPress={handleReview}
                    accessibilityLabel="Viết đánh giá cho dịch vụ này"
                  />
                )}
                <AppButton title="Đóng" variant="outline" onPress={onClose} />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    height: '82%',
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
    borderRadius: 9999,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  errorBox: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  titleSection: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 13,
    color: colors.muted,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.secondary,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  cardTextBold: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryPressed,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  sourceContent: {
    gap: spacing.xs,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.successSoft,
    padding: spacing.sm,
    borderRadius: radius.small,
  },
  resultIcon: {
    marginTop: 2,
  },
  resultText: {
    fontSize: 13,
    color: colors.success,
    flex: 1,
    lineHeight: 18,
  },
  emptyResultText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
  noShowBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.errorSoft,
    padding: spacing.sm,
    borderRadius: radius.small,
  },
  noShowText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
    lineHeight: 18,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderCodeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  orderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
  },
  orderLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  actionSection: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
});
