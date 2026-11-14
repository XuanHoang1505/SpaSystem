import { StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import type { StatusMeta } from '../utils/purchaseHelpers';

export interface PurchaseStatusBadgeProps {
  meta: StatusMeta;
  size?: 'sm' | 'md';
}

export function PurchaseStatusBadge({ meta, size = 'sm' }: PurchaseStatusBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        size === 'md' ? styles.badgeMd : styles.badgeSm,
        {
          backgroundColor: meta.backgroundColor,
          borderColor: meta.borderColor,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: meta.textColor }]} />
      <AppText
        style={[
          styles.label,
          size === 'md' ? styles.labelMd : styles.labelSm,
          { color: meta.textColor },
        ]}
      >
        {meta.label}
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
  },
  labelMd: {
    fontSize: 13,
  },
});
