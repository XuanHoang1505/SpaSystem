import { StyleSheet, View } from 'react-native';
import type { PackageItem } from '@spa/shared-types';
import { AlertCircle, CalendarClock, Layers } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing, typography } from '@theme/index';

export function PackageRoadmapItem({
  item,
}: {
  item: PackageItem;
}) {
  const isSubServiceDiscontinued = item.serviceStatus === 'discontinued';

  return (
    <View style={styles.container}>
      <View style={styles.stepBadge}>
        <AppText style={styles.stepNumber}>{item.sortOrder}</AppText>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <AppText style={styles.serviceName}>{item.serviceName}</AppText>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Layers size={12} color={colors.primary} />
            <AppText style={styles.metaText}>{item.sessionCount} buổi</AppText>
          </View>

          {item.minDaysBetweenSessions > 0 && (
            <View style={styles.metaBadge}>
              <CalendarClock size={12} color={colors.muted} />
              <AppText style={styles.metaText}>
                Cách tối thiểu {item.minDaysBetweenSessions} ngày
              </AppText>
            </View>
          )}
        </View>

        {item.note && <AppText style={styles.noteText}>{item.note}</AppText>}

        {isSubServiceDiscontinued && (
          <View style={styles.warningBox}>
            <AlertCircle size={14} color={colors.warning} />
            <AppText style={styles.warningText}>
              Dịch vụ đã ngừng bán lẻ (vẫn được phục vụ đầy đủ trong gói)
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.small,
  },
  metaText: {
    fontSize: 11,
    color: colors.muted,
  },
  noteText: {
    fontSize: typography.small,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff9e6',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.small,
    marginTop: 4,
  },
  warningText: {
    fontSize: 11,
    color: colors.warning,
    flex: 1,
  },
});
