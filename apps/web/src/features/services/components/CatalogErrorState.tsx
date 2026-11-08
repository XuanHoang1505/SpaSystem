import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { catalogErrorKind, catalogErrorMessages } from '../catalogErrors';

/** Lỗi tải danh mục theo loại (docs/specs/catalog.md, bảng mã lỗi); 404 do từng màn tự xử lý. */
export function CatalogErrorState({
  error,
  onRetry,
  retrying,
  onResetFilters,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  onResetFilters?: () => void;
}) {
  const kind = catalogErrorKind(error);
  if (kind === 'configuration')
    return (
      <ErrorState
        title="Lỗi cấu hình"
        message={error instanceof Error ? error.message : undefined}
      />
    );
  if (kind === 'invalid_filter' && onResetFilters)
    return (
      <div className="flex flex-col items-center pb-10">
        <ErrorState title="Bộ lọc không hợp lệ" className="pb-2" />
        <Button variant="outline" onClick={onResetFilters}>
          Xóa bộ lọc
        </Button>
      </div>
    );
  return (
    <ErrorState
      message={kind === 'network' ? catalogErrorMessages.network : catalogErrorMessages.server}
      onRetry={onRetry}
      retrying={retrying}
    />
  );
}
