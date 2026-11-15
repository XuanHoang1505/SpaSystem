import { Pressable, StyleSheet, View } from 'react-native';
import type { AssignedAppointment } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { AppointmentStatusBadge } from '@/features/bookings/components/AppointmentStatusBadge';
import { colors } from '@/theme/colors';
import { Clock, User, ChevronRight, AlertTriangle, FileCheck } from 'lucide-react-native';
import { formatDisplayDate } from '../utils/careHelpers';

interface Props {
  appointment: AssignedAppointment;
  onPress: (id: string) => void;
}

export function AssignedAppointmentCard({ appointment, onPress }: Props) {
  const {
    id,
    date,
    startTime,
    endTime,
    status,
    customer,
    service,
    treatmentSession,
    hasAllergies,
    hasSkinProfile,
  } = appointment;

  return (
    <Pressable
      onPress={() => onPress(id)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Buổi chăm sóc ${service.name} cho khách ${customer.fullName}`}
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.timeContainer}>
            <Clock size={15} color={colors.primary} />
            <AppText style={styles.timeText}>
              {startTime.slice(0, 5)} – {endTime.slice(0, 5)}
            </AppText>
            <AppText style={styles.dateText}>· {formatDisplayDate(date)}</AppText>
          </View>
          <View style={styles.badgeWrapper}>
            <AppointmentStatusBadge status={status} />
          </View>
        </View>

        <View style={styles.serviceSection}>
          <AppText style={styles.serviceName} numberOfLines={2}>
            {service.name}
          </AppText>
          {treatmentSession ? (
            <View style={styles.sessionBadge}>
              <AppText style={styles.sessionBadgeText}>
                Buổi {treatmentSession.sequenceNumber}/{treatmentSession.totalSessions} · {treatmentSession.packageName}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <User size={15} color={colors.muted} />
            <AppText style={styles.customerName} numberOfLines={1}>
              {customer.fullName}
            </AppText>
            {customer.phoneNumber ? (
              <AppText style={styles.customerPhone}>· {customer.phoneNumber}</AppText>
            ) : null}
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </View>

        {(hasAllergies || hasSkinProfile) && (
          <View style={styles.badgesRow}>
            {hasAllergies ? (
              <View style={styles.allergyBadge}>
                <AlertTriangle size={12} color={colors.warning} />
                <AppText style={styles.allergyBadgeText}>Có dị ứng</AppText>
              </View>
            ) : null}
            {hasSkinProfile ? (
              <View style={styles.skinProfileBadge}>
                <FileCheck size={12} color={colors.info} />
                <AppText style={styles.skinProfileBadgeText}>Đã có hồ sơ da</AppText>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 48,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    gap: 6,
    marginRight: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  dateText: {
    fontSize: 13,
    color: colors.muted,
  },
  badgeWrapper: {
    flexShrink: 0,
  },
  serviceSection: {
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  sessionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  sessionBadgeText: {
    fontSize: 12,
    color: colors.primaryPressed,
    fontWeight: '600',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  customerPhone: {
    fontSize: 13,
    color: colors.muted,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  allergyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  skinProfileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoSoft,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skinProfileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.info,
  },
});
