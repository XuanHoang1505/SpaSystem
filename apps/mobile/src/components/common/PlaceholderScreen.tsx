import { AppScreen } from './AppScreen';
import { AppText } from './AppText';
import { EmptyState } from './EmptyState';
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <AppScreen>
      <AppText accessibilityRole="header">{title}</AppText>
      <EmptyState
        title="Tính năng đang được phát triển"
        description="Đây là màn hình placeholder. Chưa có dữ liệu hoặc thao tác nghiệp vụ."
      />
    </AppScreen>
  );
}
