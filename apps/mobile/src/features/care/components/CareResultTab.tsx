import { StyleSheet, View } from 'react-native';
import type { AppointmentDetail } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { colors } from '@/theme/colors';
import { CheckCircle2, Clock, XCircle, AlertCircle, Sparkles } from 'lucide-react-native';

interface Props {
  appointment: AppointmentDetail;
  onOpenCompleteModal: () => void;
}

export function CareResultTab({ appointment, onOpenCompleteModal }: Props) {
  const { status, note, treatmentSession, cancellationReason } = appointment;

  return (
    <View style={styles.container}>
      {status === 'confirmed' && (
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Clock size={20} color={colors.primary} />
            <AppText style={styles.statusTitle}>Buổi chăm sóc đang thực hiện</AppText>
          </View>
          <AppText style={styles.desc}>
            Sau khi hoàn tất quy trình chăm sóc cho khách hàng, hãy nhấn nút bên dưới để ghi nhận kết quả và hoàn thành buổi.
          </AppText>

          <View style={styles.actionWrap}>
            <AppButton
              title="Xác nhận hoàn thành buổi chăm sóc"
              onPress={onOpenCompleteModal}
              accessibilityLabel="Xác nhận hoàn thành buổi chăm sóc"
            />
          </View>
        </View>
      )}

      {status === 'completed' && (
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <CheckCircle2 size={20} color={colors.success} />
            <AppText style={[styles.statusTitle, { color: colors.success }]}>
              Buổi chăm sóc đã hoàn thành
            </AppText>
          </View>

          {treatmentSession ? (
            <View style={styles.sessionBox}>
              <Sparkles size={16} color={colors.primary} />
              <AppText style={styles.sessionBoxText}>
                Tiến độ: Buổi {treatmentSession.sequenceNumber}/{treatmentSession.totalSessions} của {treatmentSession.packageName}
              </AppText>
            </View>
          ) : null}

          <View style={styles.resultBox}>
            <AppText style={styles.resultLabel}>Ghi chú & Kết quả buổi:</AppText>
            <AppText style={styles.resultText}>
              {note || (treatmentSession ? 'Kết quả được ghi nhận trong liệu trình của khách hàng.' : 'Không có ghi chú kết quả.')}
            </AppText>
          </View>
        </View>
      )}

      {status === 'cancelled' && (
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <XCircle size={20} color={colors.error} />
            <AppText style={[styles.statusTitle, { color: colors.error }]}>
              Buổi chăm sóc đã hủy
            </AppText>
          </View>
          {cancellationReason ? (
            <View style={styles.resultBox}>
              <AppText style={styles.resultLabel}>Lý do hủy:</AppText>
              <AppText style={styles.resultText}>{cancellationReason}</AppText>
            </View>
          ) : null}
        </View>
      )}

      {status === 'no_show' && (
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <AlertCircle size={20} color={colors.error} />
            <AppText style={[styles.statusTitle, { color: colors.error }]}>
              Khách hàng không đến
            </AppText>
          </View>
          <AppText style={styles.desc}>
            Lịch hẹn này đã được hệ thống ghi nhận là khách không đến (No-show).
          </AppText>
        </View>
      )}

      {status === 'pending_confirmation' && (
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Clock size={20} color={colors.warning} />
            <AppText style={[styles.statusTitle, { color: colors.warning }]}>
              Đang chờ xác nhận
            </AppText>
          </View>
          <AppText style={styles.desc}>
            Lịch hẹn này đang chờ quản lý hoặc khách hàng xác nhận trước khi thực hiện.
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  desc: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionWrap: {
    marginTop: 8,
  },
  sessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  sessionBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryPressed,
    flex: 1,
  },
  resultBox: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  resultText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
