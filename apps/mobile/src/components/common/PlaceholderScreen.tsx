import { AppScreen } from './AppScreen';
import { EmptyState } from './EmptyState';

/** A tab whose feature is not built yet. The navigation bar already shows `title`, so only the description names it. */
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <AppScreen>
      <EmptyState
        title="Tính năng đang được phát triển"
        description={`Màn hình "${title}" chưa có dữ liệu hoặc thao tác nghiệp vụ.`}
      />
    </AppScreen>
  );
}
