import type { ReactNode } from 'react';
import { Link, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { EmptyState } from '@components/common/EmptyState';
import { colors, radius, spacing } from '@theme/index';

export function WorkspaceOverviewScreen({
  title,
  links,
  footer,
}: {
  title: string;
  links: readonly { href: Href; title: string }[];
  /** Extra actions under the links, e.g. the logout button. */
  footer?: ReactNode;
}) {
  return (
    <AppScreen>
      <AppText accessibilityRole="header">{title}</AppText>
      <EmptyState
        title="Tính năng đang được phát triển"
        description="Các màn nghiệp vụ của khu vực này sẽ có ở các bản sau."
      />
      {links.map((link) => (
        <Link
          key={String(link.href)}
          href={link.href}
          accessibilityLabel={link.title}
          style={styles.link}
        >
          {link.title}
        </Link>
      ))}
      <Link href="/" accessibilityLabel="Về trang chủ" style={styles.link}>
        Về trang chủ
      </Link>
      {footer}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: 48,
    padding: spacing.md,
    borderRadius: radius.small,
    backgroundColor: colors.surface,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
