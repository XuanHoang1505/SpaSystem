import { StyleSheet, View } from 'react-native';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  MinusCircle,
  Sparkles,
} from 'lucide-react-native';
import type { MyTreatmentSession } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppText } from '@components/common/AppText';
import { PurchaseStatusBadge } from '@/features/purchases/components/PurchaseStatusBadge';
import {
  formatUtcDateVn,
  getTreatmentSessionStatusMeta,
} from '@/features/purchases/utils/purchaseHelpers';
import { formatDuration, formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';

export interface TreatmentSessionTimelineProps {
  sessions: readonly MyTreatmentSession[];
  onPressBookSession: (session: MyTreatmentSession) => void;
  onPressViewAppointment: (appointmentId: string) => void;
  onPressViewNote: (session: MyTreatmentSession) => void;
}

export function TreatmentSessionTimeline({
  sessions,
  onPressBookSession,
  onPressViewAppointment,
  onPressViewNote,
}: TreatmentSessionTimelineProps) {
  const ordered = [...sessions].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  return (
    <View style={styles.container}>
      <AppText style={styles.sectionTitle}>Nhật ký liệu trình ({ordered.length} buổi)</AppText>

      <View style={styles.timelineList}>
        {ordered.map((session) => {
          const statusMeta = getTreatmentSessionStatusMeta(session.status);
          const isCompleted = session.status === 'completed';
          const isBooked = session.status === 'booked';
          const isSkipped = session.status === 'skipped';

          return (
            <View
              key={session.id}
              style={[
                styles.sessionCard,
                isCompleted && styles.sessionCardCompleted,
                isBooked && styles.sessionCardBooked,
              ]}
            >
              {/* Header Row: Sequence Circle + Buổi N + Status Badge */}
              <View style={styles.headerRow}>
                <View style={styles.leftHeader}>
                  <View
                    style={[
                      styles.seqCircle,
                      isCompleted && styles.seqCircleCompleted,
                      isBooked && styles.seqCircleBooked,
                      isSkipped && styles.seqCircleSkipped,
                    ]}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={16} color={colors.onPrimary} />
                    ) : isSkipped ? (
                      <MinusCircle size={16} color={colors.muted} />
                    ) : (
                      <AppText
                        style={[styles.seqNumberText, isBooked && styles.seqNumberTextBooked]}
                      >
                        {session.sequenceNumber}
                      </AppText>
                    )}
                  </View>
                  <View style={styles.titleCol}>
                    <View style={styles.sequenceBadgeRow}>
                      <AppText style={styles.sessionSequenceLabel}>
                        BUỔI {session.sequenceNumber}
                      </AppText>
                      <Sparkles size={11} color={colors.leaf} />
                    </View>
                    <AppText style={styles.serviceName}>{session.serviceName}</AppText>
                  </View>
                </View>

                <PurchaseStatusBadge meta={statusMeta} />
              </View>

              {/* Duration line */}
              <View style={styles.metaRow}>
                <Clock size={14} color={colors.muted} />
                <AppText style={styles.metaText} numberOfLines={1}>
                  Thời lượng: {formatDuration(session.durationMinutes)}
                </AppText>
              </View>

              {/* Status-Specific Body */}
              {isCompleted && (
                <View style={styles.completedBox}>
                  <AppText style={styles.completedInfoText}>
                    Thực hiện ngày{' '}
                    {session.appointment
                      ? formatLocalDate(session.appointment.date)
                      : formatUtcDateVn(session.completedAtUtc)}
                    {session.appointment?.staff
                      ? ` · KTV ${session.appointment.staff.fullName}`
                      : ''}
                  </AppText>
                  <AppButton
                    title="Xem ghi chú trị liệu"
                    variant="outline"
                    onPress={() => onPressViewNote(session)}
                  />
                </View>
              )}

              {isBooked && session.appointment && (
                <View style={styles.bookedBox}>
                  <View style={styles.bookedInfoRow}>
                    <CalendarCheck size={16} color={colors.primary} />
                    <View style={styles.bookedTextCol}>
                      <AppText style={styles.bookedDateText}>
                        {formatLocalDate(session.appointment.date)} ·{' '}
                        {formatLocalTime(session.appointment.startTime)} –{' '}
                        {formatLocalTime(session.appointment.endTime)}
                      </AppText>
                      <AppText style={styles.bookedStaffText}>
                        Kỹ thuật viên: {session.appointment.staff.fullName}
                      </AppText>
                    </View>
                  </View>
                  <AppButton
                    title="Xem lịch hẹn"
                    variant="outline"
                    onPress={() => onPressViewAppointment(session.appointment!.id)}
                  />
                </View>
              )}

              {session.status === 'not_booked' && (
                <View style={styles.notBookedBox}>
                  {session.canBook ? (
                    <>
                      {session.earliestDate && (
                        <AppText style={styles.earliestDateText}>
                          Đặt lịch sớm nhất từ {formatLocalDate(session.earliestDate)}
                        </AppText>
                      )}
                      <AppButton
                        title="Đặt lịch buổi này"
                        variant="primary"
                        onPress={() => onPressBookSession(session)}
                      />
                    </>
                  ) : (
                    <View style={styles.reasonBox}>
                      <FileText size={14} color={colors.muted} />
                      <AppText style={styles.reasonText}>
                        {session.reason ?? 'Cần đặt lịch các buổi trước theo thứ tự.'}
                      </AppText>
                    </View>
                  )}
                </View>
              )}

              {isSkipped && (
                <AppText style={styles.skippedText}>Buổi này đã được bỏ qua trong phác đồ.</AppText>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  timelineList: {
    gap: spacing.sm,
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  sessionCardCompleted: {
    borderColor: colors.successBorder,
  },
  sessionCardBooked: {
    borderColor: colors.secondary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  leftHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seqCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqCircleCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  seqCircleBooked: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  seqCircleSkipped: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  seqNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  seqNumberTextBooked: {
    color: colors.primary,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  sequenceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionSequenceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  completedBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  completedInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  bookedBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.small,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  bookedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookedTextCol: {
    flex: 1,
    gap: 2,
  },
  bookedDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  bookedStaffText: {
    fontSize: 12,
    color: colors.text,
  },
  notBookedBox: {
    gap: spacing.xs,
  },
  earliestDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 18,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
  },
  skippedText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.muted,
  },
});
