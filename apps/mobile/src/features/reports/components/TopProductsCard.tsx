import { StyleSheet, View } from 'react-native';
import { Award, PackageCheck } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency, formatNumber } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import { formatSharePercent, productKindBadgeConfig } from '../utils/reportHelpers';
import type { ProductRevenueDto } from '@spa/shared-types';

export function TopProductsCard({ items }: { items?: readonly ProductRevenueDto[] }) {
  const list = items ?? [];

  return (
    <View style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Award size={18} color={colors.primary} />
          <AppText style={styles.title}>Top sản phẩm doanh thu</AppText>
        </View>
        <AppText style={styles.subtitle}>Sản phẩm & gói đóng góp cao nhất</AppText>
      </View>

      {/* 2. Danh sách sản phẩm */}
      {list.length === 0 ? (
        <View style={styles.emptyContainer}>
          <PackageCheck size={32} color={colors.muted} />
          <AppText style={styles.emptyText}>
            Không có sản phẩm nào phát sinh doanh thu trong khoảng này
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((item, index) => {
            const rank = index + 1;
            const badgeConfig = productKindBadgeConfig[item.productType];

            return (
              <View key={`${item.productType}-${item.productId}`} style={styles.productItem}>
                {/* Hàng 1: Thứ hạng, Tên sản phẩm, Doanh thu */}
                <View style={styles.topRow}>
                  {/* Rank badge */}
                  <View
                    style={[
                      styles.rankBadge,
                      rank === 1 && styles.rank1Badge,
                      rank === 2 && styles.rank2Badge,
                      rank === 3 && styles.rank3Badge,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.rankText,
                        rank === 1 && styles.rank1Text,
                        rank === 2 && styles.rank2Text,
                        rank === 3 && styles.rank3Text,
                      ]}
                    >
                      #{rank}
                    </AppText>
                  </View>

                  {/* Product name & badge */}
                  <View style={styles.nameWrap}>
                    <AppText style={styles.productName} numberOfLines={1}>
                      {item.productName}
                    </AppText>
                    <View style={styles.tagsRow}>
                      <View
                        style={[
                          styles.kindBadge,
                          {
                            backgroundColor: badgeConfig.bg,
                            borderColor: badgeConfig.border,
                          },
                        ]}
                      >
                        <AppText style={[styles.kindText, { color: badgeConfig.text }]}>
                          {badgeConfig.label}
                        </AppText>
                      </View>
                      <AppText style={styles.quantityText}>
                        {formatNumber(item.quantity)} lượt bán
                      </AppText>
                    </View>
                  </View>

                  {/* Doanh thu */}
                  <View style={styles.revenueWrap}>
                    <AppText style={styles.revenueValue}>{formatCurrency(item.revenue)}</AppText>
                    <AppText style={styles.sharePercent}>
                      {formatSharePercent(item.sharePercent)}
                    </AppText>
                  </View>
                </View>

                {/* Hàng 2: Progress bar tỷ trọng */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.max(2, Math.min(item.sharePercent, 100))}%`,
                        backgroundColor:
                          item.productType === 'package' ? colors.primary : '#2F5677',
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  header: {
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  list: {
    gap: spacing.md,
  },
  productItem: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank1Badge: {
    backgroundColor: '#F7ECD9',
    borderWidth: 1,
    borderColor: '#EAD3A8',
  },
  rank2Badge: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rank3Badge: {
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral,
  },
  rank1Text: {
    color: '#8A6116',
  },
  rank2Text: {
    color: '#334155',
  },
  rank3Text: {
    color: '#9A3412',
  },
  nameWrap: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kindBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  kindText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 11,
    color: colors.muted,
  },
  revenueWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  revenueValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sharePercent: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
});
