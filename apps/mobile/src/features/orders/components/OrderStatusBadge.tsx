import { StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import type { OrderStatus } from '@spa/shared-types';
import { getOrderStatusMeta, type StatusMeta } from '../utils/orderHelpers';

export interface OrderStatusBadgeProps {
  status?: OrderStatus;
  meta?: StatusMeta;
  size?: 'sm' | 'md';
}

export function OrderStatusBadge({ status, meta, size = 'sm' }: OrderStatusBadgeProps) {
  const resolvedMeta = meta ?? (status ? getOrderStatusMeta(status) : null);
  if (!resolvedMeta) return null;

  return (
    <View
      style={[
        styles.badge,
        size === 'md' ? styles.badgeMd : styles.badgeSm,
        {
          backgroundColor: resolvedMeta.backgroundColor,
          borderColor: resolvedMeta.borderColor,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: resolvedMeta.textColor }]} />
      <AppText
        style={[
          styles.label,
          size === 'md' ? styles.labelMd : styles.labelSm,
          { color: resolvedMeta.textColor },
        ]}
      >
        {resolvedMeta.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
  },
  badgeSm: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 12,
    lineHeight: 16,
  },
  labelMd: {
    fontSize: 13,
    lineHeight: 18,
  },
});
