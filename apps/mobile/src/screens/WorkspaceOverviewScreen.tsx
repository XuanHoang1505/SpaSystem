import { Link, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { EmptyState } from '@components/common/EmptyState';
import { colors, radius, spacing } from '@theme/index';

export function WorkspaceOverviewScreen({
  title,
  links,
}: {
  title: string;
  links: readonly { href: Href; title: string }[];
}) {
  return (
    <AppScreen>
      <AppText accessibilityRole="header">{title}</AppText>
      <EmptyState
        title="Tính năng đang được phát triển"
        description="Bản xem trước navigation. Chưa có xác thực hoặc dữ liệu nghiệp vụ."
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
