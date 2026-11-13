import { StyleSheet, View } from 'react-native';
import type { OrderPreviewItem } from '@spa/shared-types';
import { Package, Sparkles } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

export function CheckoutProductItem({ item }: { item: OrderPreviewItem }) {
  const isPackage = item.type === 'package';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {isPackage ? (
          <Package size={20} color={colors.primary} />
        ) : (
          <Sparkles size={20} color={colors.primary} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.typeBadge, isPackage && styles.packageBadge]}>
            <AppText style={[styles.typeText, isPackage && styles.packageText]}>
              {isPackage ? 'Gói liệu trình' : 'Dịch vụ'}
            </AppText>
          </View>
        </View>

        <AppText style={styles.name} numberOfLines={2}>
          {item.productName}
        </AppText>

        <View style={styles.priceRow}>
          <AppText style={styles.unitPrice}>
            {formatCurrency(item.unitPrice)}
          </AppText>

          {item.discountAmount > 0 && (
            <AppText style={styles.discount}>
              -{formatCurrency(item.discountAmount)}
            </AppText>
          )}

          <AppText style={styles.lineTotal}>
            {formatCurrency(item.lineTotal)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.small,
    backgroundColor: '#f5ebe6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#edf4ed',
  },
  packageBadge: {
    backgroundColor: '#ede9fe',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e7d32',
  },
  packageText: {
    color: '#6d28d9',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitPrice: {
    fontSize: 13,
    color: colors.muted,
  },
  discount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
