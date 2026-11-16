import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import type { CareHistoryItem } from '@spa/shared-types';
import { Clock, Phone, Sparkles, AlertTriangle, FileText, ChevronRight, CheckCircle2 } from 'lucide-react-native';

interface Props {
  item: CareHistoryItem;
  onPress: () => void;
}

export function CareHistoryCard({ item, onPress }: Props) {
  const { date, startTime, endTime, customer, service, treatmentSession, hasAllergies, skinProfileId } = item;

  const handleCall = () => {
    if (customer.phoneNumber) {
      Linking.openURL(`tel:${customer.phoneNumber}`).catch(() => {});
    }
  };

  const [y, m, d] = date.split('-');
  const dateFormatted = `${d}/${m}/${y}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Buổi chăm sóc ${service.name} cho khách ${customer.fullName}`}
    >
      {/* Header: Date, Time & Completed indicator */}
      <View style={styles.header}>
        <View style={styles.timeTag}>
          <Clock size={12} color={colors.primaryPressed} />
          <AppText style={styles.timeText}>
            {startTime} – {endTime} · {dateFormatted}
          </AppText>
        </View>

        <View style={styles.completedBadge}>
          <CheckCircle2 size={12} color={colors.success} />
          <AppText style={styles.completedText}>Hoàn thành</AppText>
        </View>
      </View>

      {/* Service Info */}
      <AppText style={styles.serviceName}>{service.name}</AppText>

      {/* Treatment Session info if part of package */}
      {treatmentSession ? (
        <View style={styles.sessionBox}>
          <Sparkles size={12} color={colors.primary} />
          <AppText style={styles.sessionText}>
            Buổi {treatmentSession.sequenceNumber}/{treatmentSession.totalSessions} · {treatmentSession.packageName}
          </AppText>
        </View>
      ) : null}

      {/* Customer info with call link */}
      <View style={styles.customerRow}>
        <AppText style={styles.customerName}>{customer.fullName}</AppText>
        {customer.phoneNumber ? (
          <Pressable
            onPress={handleCall}
            hitSlop={8}
            style={styles.phoneLink}
            accessibilityRole="button"
            accessibilityLabel={`Gọi điện cho ${customer.fullName}`}
          >
            <Phone size={12} color={colors.primary} />
            <AppText style={styles.phoneText}>{customer.phoneNumber}</AppText>
          </Pressable>
        ) : null}
      </View>

      {/* Badges footer: Skin profile & Allergies */}
      <View style={styles.badgesFooter}>
        <View style={styles.badgesGroup}>
          {skinProfileId ? (
            <View style={styles.profileBadgeSuccess}>
              <Sparkles size={11} color={colors.primaryPressed} />
              <AppText style={styles.profileBadgeSuccessText}>Đã có hồ sơ da</AppText>
            </View>
          ) : (
            <View style={styles.profileBadgeNeutral}>
              <FileText size={11} color={colors.muted} />
              <AppText style={styles.profileBadgeNeutralText}>Chưa có hồ sơ da</AppText>
            </View>
          )}

          {hasAllergies ? (
            <View style={styles.allergyBadge}>
              <AlertTriangle size={11} color={colors.warning} />
              <AppText style={styles.allergyBadgeText}>Có dị ứng</AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.chevronWrap}>
          <ChevronRight size={16} color={colors.muted} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.85,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryPressed,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sessionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryPressed,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  badgesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 2,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  profileBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  profileBadgeSuccessText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  profileBadgeNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  profileBadgeNeutralText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  allergyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
  },
  chevronWrap: {
    paddingLeft: 4,
  },
});
