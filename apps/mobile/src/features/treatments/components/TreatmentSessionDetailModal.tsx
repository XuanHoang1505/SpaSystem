import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FileText, Sparkles, UserRound, X } from 'lucide-react-native';
import type { MyTreatmentSession } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppText } from '@components/common/AppText';
import { formatUtcDateVn } from '@/features/purchases/utils/purchaseHelpers';
import { formatDuration, formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { useMyTreatmentSession } from '../hooks/useMyTreatmentSession';
import { classifyTreatmentError } from '../utils/treatmentHelpers';

export interface TreatmentSessionDetailModalProps {
  visible: boolean;
  treatmentId: string;
  session: MyTreatmentSession | null;
  onClose: () => void;
}

export function TreatmentSessionDetailModal({
  visible,
  treatmentId,
  session,
  onClose,
}: TreatmentSessionDetailModalProps) {
  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyTreatmentSession(treatmentId, session?.id, visible && Boolean(session));

  const displaySession = detail ?? session;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <FileText size={18} color={colors.primary} />
              <AppText style={styles.headerTitle}>Ghi chú buổi trị liệu</AppText>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng ghi chú"
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText style={styles.loadingText}>Đang tải ghi chú buổi chăm sóc...</AppText>
            </View>
          ) : isError ? (
            <View style={styles.errorBox}>
              <AppNotice
                tone="error"
                title="Không tải được ghi chú"
                message={classifyTreatmentError(error).message}
              />
              <AppButton title="Thử lại" onPress={() => refetch()} />
            </View>
          ) : displaySession ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.sessionSummaryBox}>
                <View style={styles.summaryTopRow}>
                  <Sparkles size={16} color={colors.primary} />
                  <AppText style={styles.sessionTitle}>
                    Buổi {displaySession.sequenceNumber}: {displaySession.serviceName}
                  </AppText>
                </View>
                <AppText style={styles.sessionMeta}>
                  Thời lượng: {formatDuration(displaySession.durationMinutes)} · Hoàn thành ngày{' '}
                  {displaySession.appointment
                    ? formatLocalDate(displaySession.appointment.date)
                    : formatUtcDateVn(displaySession.completedAtUtc)}
                </AppText>
                {displaySession.appointment?.staff && (
                  <View style={styles.staffRow}>
                    <UserRound size={14} color={colors.primary} />
                    <AppText style={styles.staffText}>
                      Kỹ thuật viên: {displaySession.appointment.staff.fullName}
                    </AppText>
                  </View>
                )}
              </View>

              <View style={styles.resultSection}>
                <AppText style={styles.resultLabel}>Kết quả & Ghi chú của kỹ thuật viên</AppText>
                <View style={styles.resultCard}>
                  <AppText style={styles.resultText}>
                    {displaySession.result && displaySession.result.trim().length > 0
                      ? displaySession.result
                      : 'Chưa có ghi chú'}
                  </AppText>
                </View>
              </View>
            </ScrollView>
          ) : null}

          <View style={styles.footer}>
            <AppButton title="Đóng" variant="outline" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 40, 29, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: '82%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  centered: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  errorBox: {
    padding: spacing.md,
    gap: spacing.md,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sessionSummaryBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    padding: spacing.md,
    gap: 6,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  sessionMeta: {
    fontSize: 13,
    color: colors.text,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staffText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  resultSection: {
    gap: 6,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  resultText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
