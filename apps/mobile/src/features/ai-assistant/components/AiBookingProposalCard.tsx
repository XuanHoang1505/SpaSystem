import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Clock, UserRound } from 'lucide-react-native';
import type { AiBookingProposal } from '@spa/shared-types';
import { AppButton } from '@components/common/AppButton';
import { AppText } from '@components/common/AppText';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { useAuthStore } from '@/stores/authStore';
import { colors, radius, spacing } from '@theme/index';

export function AiBookingProposalCard({ proposal }: { proposal: AiBookingProposal }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated';

  const handleBook = () => {
    if (isAuthenticated) {
      router.push(proposal.path as any);
    } else {
      router.push(
        `/(public)/login?redirect=${encodeURIComponent(proposal.path)}` as any,
      );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Calendar size={18} color={colors.primary} />
        <AppText style={styles.serviceName}>{proposal.serviceName}</AppText>
      </View>

      <View style={styles.detailsCol}>
        <View style={styles.metaRow}>
          <Calendar size={13} color={colors.muted} />
          <AppText style={styles.metaText}>{formatLocalDate(proposal.date)}</AppText>
        </View>

        <View style={styles.metaRow}>
          <Clock size={13} color={colors.muted} />
          <AppText style={styles.metaText}>
            {formatLocalTime(proposal.startTime)} – {formatLocalTime(proposal.endTime)}
          </AppText>
        </View>

        {proposal.staffName && (
          <View style={styles.metaRow}>
            <UserRound size={13} color={colors.muted} />
            <AppText style={styles.metaText}>Kỹ thuật viên: {proposal.staffName}</AppText>
          </View>
        )}
      </View>

      <View style={styles.bookBtnWrap}>
        <AppButton
          title="Đặt lịch theo đề xuất"
          variant="primary"
          onPress={handleBook}
        />
      </View>

      <AppText style={styles.notice}>
        Giờ hẹn chưa được giữ chỗ. Vui lòng bấm để hoàn tất đặt lịch.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  serviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  detailsCol: {
    gap: 4,
    marginVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  bookBtnWrap: {
    marginTop: spacing.xs,
  },
  notice: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },
});
