import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, Clock, Phone, Sparkles, UserRound, X } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppInput } from '@components/common/AppInput';
import { AppNotice } from '@components/common/AppNotice';
import { AppText } from '@components/common/AppText';
import { formatDateTimeUtc, formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { toast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@theme/index';
import { useOwnerAppointment, useOwnerAppointmentAction } from '../hooks/useOwnerAppointments';
import { getTodayVnNow } from '../utils/bookingHelpers';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : 'Không thực hiện được thao tác. Vui lòng thử lại.';

/**
 * The owner's appointment detail (UC-SPA-17) with the commands that need no slot picking: confirm, cancel with a
 * reason, mark a no-show. Moving an appointment or changing its staff member stays on the web.
 */
export function OwnerAppointmentSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const detail = useOwnerAppointment(id);
  const action = useOwnerAppointmentAction();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();

  useEffect(() => {
    setCancelling(false);
    setReason('');
    setReasonError(undefined);
  }, [id]);

  const appointment = detail.data;
  const now = getTodayVnNow();
  const started =
    appointment !== undefined &&
    (appointment.date < now.date ||
      (appointment.date === now.date && formatLocalTime(appointment.startTime) <= now.time));
  const canConfirm = appointment?.status === 'pending_confirmation';
  const canCancel =
    appointment?.status === 'pending_confirmation' || appointment?.status === 'confirmed';
  const canMarkNoShow = appointment?.status === 'confirmed' && started;

  const run = (input: Parameters<typeof action.mutate>[0], success: string, after?: () => void) =>
    action.mutate(input, {
      onSuccess: () => {
        toast.success(success);
        after?.();
      },
      onError: (error) => toast.error(errorMessage(error)),
    });

  const submitCancel = () => {
    const trimmed = reason.trim();
    if (trimmed.length === 0 || trimmed.length > 500) {
      setReasonError('Nhập lý do hủy (tối đa 500 ký tự).');
      return;
    }
    if (!id) return;
    run({ type: 'cancel', id, reason: trimmed }, 'Đã hủy lịch hẹn.', () => setCancelling(false));
  };

  return (
    <Modal visible={id !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng chi tiết" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.header}>
            <AppText style={styles.title}>Chi tiết lịch hẹn</AppText>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Đóng chi tiết"
              style={styles.close}
            >
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          {detail.isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : detail.isError || !appointment ? (
            <View style={styles.body}>
              <AppNotice tone="error" message={errorMessage(detail.error)} />
              <AppButton title="Thử lại" variant="outline" onPress={() => void detail.refetch()} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <View style={styles.titleRow}>
                <AppText style={styles.service}>{appointment.service.name}</AppText>
                <AppointmentStatusBadge status={appointment.status} />
              </View>
              {appointment.treatmentSession ? (
                <AppText style={styles.muted}>
                  Buổi {appointment.treatmentSession.sequenceNumber}/
                  {appointment.treatmentSession.totalSessions} ·{' '}
                  {appointment.treatmentSession.packageName}
                </AppText>
              ) : null}

              <View style={styles.rows}>
                <Row icon={CalendarDays} text={formatLocalDate(appointment.date)} />
                <Row
                  icon={Clock}
                  text={`${formatLocalTime(appointment.startTime)} – ${formatLocalTime(appointment.endTime)}`}
                />
                <Row icon={UserRound} text={`Khách: ${appointment.customer.fullName}`} />
                {appointment.customer.phoneNumber ? (
                  <Pressable
                    onPress={() => void Linking.openURL(`tel:${appointment.customer.phoneNumber}`)}
                    accessibilityRole="link"
                    accessibilityLabel={`Gọi ${appointment.customer.phoneNumber}`}
                  >
                    <Row icon={Phone} text={appointment.customer.phoneNumber} link />
                  </Pressable>
                ) : null}
                <Row icon={Sparkles} text={`Kỹ thuật viên: ${appointment.staff.fullName}`} />
              </View>

              {appointment.note ? (
                <AppNotice tone="info" title="Ghi chú của khách" message={appointment.note} />
              ) : null}
              {appointment.allergies.length > 0 ? (
                <AppNotice
                  tone="error"
                  title="Dị ứng đã ghi nhận"
                  message={appointment.allergies.map((item) => item.allergen).join(', ')}
                />
              ) : null}
              {appointment.cancellationReason ? (
                <AppNotice tone="info" title="Lý do hủy" message={appointment.cancellationReason} />
              ) : null}
              <AppText style={styles.muted}>
                Tạo lúc {formatDateTimeUtc(appointment.createdAtUtc)}
              </AppText>

              {cancelling ? (
                <View style={styles.cancelBox}>
                  <AppInput
                    label="Lý do hủy"
                    value={reason}
                    onChangeText={(text) => {
                      setReason(text);
                      setReasonError(undefined);
                    }}
                    error={reasonError}
                    multiline
                    maxLength={500}
                    placeholder="Ví dụ: Khách gọi báo bận"
                  />
                  <AppButton
                    title="Xác nhận hủy lịch"
                    loading={action.isPending}
                    onPress={submitCancel}
                  />
                  <AppButton
                    title="Quay lại"
                    variant="outline"
                    onPress={() => setCancelling(false)}
                  />
                </View>
              ) : (
                <View style={styles.actions}>
                  {canConfirm ? (
                    <AppButton
                      title="Xác nhận lịch hẹn"
                      loading={action.isPending}
                      onPress={() =>
                        run({ type: 'confirm', id: appointment.id }, 'Đã xác nhận lịch hẹn.')
                      }
                    />
                  ) : null}
                  {canMarkNoShow ? (
                    <AppButton
                      title="Đánh dấu khách không đến"
                      variant="outline"
                      loading={action.isPending}
                      onPress={() =>
                        run({ type: 'no_show', id: appointment.id }, 'Đã ghi nhận khách không đến.')
                      }
                    />
                  ) : null}
                  {canCancel ? (
                    <AppButton
                      title="Hủy lịch hẹn"
                      variant="outline"
                      onPress={() => setCancelling(true)}
                    />
                  ) : null}
                  {canConfirm || canCancel ? (
                    <AppText style={styles.hint}>
                      Dời giờ hoặc đổi kỹ thuật viên thực hiện trên trang quản trị web.
                    </AppText>
                  ) : null}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Row({
  icon: Icon,
  text,
  link = false,
}: {
  icon: typeof Clock;
  text: string;
  link?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Icon size={16} color={colors.primary} />
      <AppText style={[styles.rowText, link && styles.link]}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  loader: { marginVertical: spacing.xxl },
  body: { padding: spacing.lg, gap: spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  service: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  muted: { fontSize: 12, color: colors.muted },
  rows: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.small,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 24 },
  rowText: { flex: 1, fontSize: 14, color: colors.text },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  cancelBox: { gap: spacing.sm },
  actions: { gap: spacing.sm },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
