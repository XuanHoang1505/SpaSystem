import { StyleSheet, View } from 'react-native';
import type { AppointmentStatus } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { getAppointmentStatusMeta } from '../utils/bookingHelpers';

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = getAppointmentStatusMeta(status);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: meta.backgroundColor,
          borderColor: meta.borderColor,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Trạng thái: ${meta.label}`}
    >
      <AppText style={[styles.badgeText, { color: meta.textColor }]}>{meta.label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
