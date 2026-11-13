import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing, typography } from '@theme/index';

export type ProfileMenuItem = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onPress: () => void;
  /** The screen is not built yet: shows "Sắp có" in place of the chevron. */
  soon?: boolean;
  /** A destructive action such as signing out: red text, no chevron. */
  tone?: 'default' | 'danger';
  /** Shows a spinner and blocks presses while the action runs. */
  busy?: boolean;
};

export type ProfileMenuSection = { title: string; items: ProfileMenuItem[] };

/** Shortcut lists grouped under small headings, each group in one white card. */
export function ProfileMenu({ sections }: { sections: ProfileMenuSection[] }) {
  return (
    <View style={styles.sections}>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <AppText accessibilityRole="header" style={styles.sectionTitle}>
            {section.title}
          </AppText>
          <View style={styles.card}>
            {section.items.map((item, index) => (
              <MenuRow key={item.title} item={item} last={index === section.items.length - 1} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function MenuRow({ item, last }: { item: ProfileMenuItem; last: boolean }) {
  const Icon = item.icon;
  const danger = item.tone === 'danger';
  const tint = danger ? colors.error : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={item.soon ? 'Tính năng sắp có' : undefined}
      accessibilityState={{ busy: item.busy, disabled: item.busy }}
      disabled={item.busy}
      onPress={item.onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, !last && styles.divider]}
    >
      <View style={[styles.iconWell, danger && styles.iconWellDanger]}>
        <Icon size={18} color={tint} strokeWidth={1.75} />
      </View>
      <View style={styles.copy}>
        <AppText style={[styles.title, danger && styles.titleDanger]}>{item.title}</AppText>
        {item.subtitle ? (
          <AppText style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </AppText>
        ) : null}
      </View>
      {item.busy ? (
        <ActivityIndicator color={tint} />
      ) : item.soon ? (
        <View style={styles.soon}>
          <AppText style={styles.soonText}>Sắp có</AppText>
        </View>
      ) : danger ? null : (
        <ChevronRight size={18} color={colors.muted} strokeWidth={1.75} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: {
    marginLeft: spacing.sm,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { backgroundColor: colors.background },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconWellDanger: { backgroundColor: colors.background },
  copy: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: typography.body, fontWeight: '600' },
  titleDanger: { color: colors.error },
  subtitle: { color: colors.muted, fontSize: typography.small },
  soon: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  soonText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
});
