import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Clock, Package, Sparkles, User } from 'lucide-react-native';
import type { ServiceHistoryItem } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { colors, radius, shadows, spacing } from '@theme/index';
import {
  formatServiceHistoryDate,
  getServiceHistorySourceLabel,
  getServiceHistoryStatusMeta,
} from '../utils/historyStatus';

interface Props {
  item: ServiceHistoryItem;
  onPress: () => void;
}

export function ServiceHistoryCard({ item, onPress }: Props) {
  const statusMeta = getServiceHistoryStatusMeta(item.status);
  const sourceMeta = getServiceHistorySourceLabel(
    item.source,
    item.packageName,
    item.sequenceNumber,
  );
  const formattedDate = formatServiceHistoryDate(item.date);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadows.card,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Lần sử dụng ${item.serviceName}, ngày ${formattedDate}, trạng thái ${statusMeta.label}`}
    >
      {/* Header: Date & Status */}
      <View style={styles.headerRow}>
        <View style={styles.timeTag}>
          <Clock size={13} color={colors.primary} />
          <AppText style={styles.timeText}>
            {item.startTime} – {item.endTime} · {formattedDate}
          </AppText>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusMeta.backgroundColor,
              borderColor: statusMeta.borderColor,
            },
          ]}
        >
          <AppText style={[styles.statusText, { color: statusMeta.textColor }]}>
            {statusMeta.label}
          </AppText>
        </View>
      </View>

      {/* Service Name */}
      <AppText style={styles.serviceName}>{item.serviceName}</AppText>

      {/* Source Tag */}
      <View style={styles.sourceRow}>
        <View
          style={[
            styles.sourceBadge,
            sourceMeta.isPackage ? styles.packageBadge : styles.serviceBadge,
          ]}
        >
          {sourceMeta.isPackage ? (
            <Package size={12} color={colors.primary} />
          ) : (
            <Sparkles size={12} color={colors.muted} />
          )}
          <AppText
            style={[
              styles.sourceText,
              sourceMeta.isPackage ? styles.packageText : styles.serviceText,
            ]}
          >
            {sourceMeta.label}
          </AppText>
        </View>
      </View>

      {/* Footer: Staff & Detail Button */}
      <View style={styles.footerRow}>
        <View style={styles.staffInfo}>
          <User size={13} color={colors.muted} />
          <AppText style={styles.staffText}>
            KTV: <AppText style={styles.staffName}>{item.staff.fullName}</AppText>
          </AppText>
        </View>

        <View style={styles.actionBtn}>
          <AppText style={styles.actionBtnText}>Chi tiết</AppText>
          <ChevronRight size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.88,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryPressed,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.small,
  },
  packageBadge: {
    backgroundColor: colors.secondary,
  },
  serviceBadge: {
    backgroundColor: colors.neutralSoft,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  packageText: {
    color: colors.primaryPressed,
  },
  serviceText: {
    color: colors.muted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  staffText: {
    fontSize: 12,
    color: colors.muted,
  },
  staffName: {
    fontWeight: '600',
    color: colors.text,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 36,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
