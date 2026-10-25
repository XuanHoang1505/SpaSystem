import { AppCard } from './AppCard';
import { AppText } from './AppText';
export function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Nội dung sẽ xuất hiện khi tính năng được triển khai.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <AppCard>
      <AppText accessibilityRole="header">{title}</AppText>
      <AppText>{description}</AppText>
    </AppCard>
  );
}
