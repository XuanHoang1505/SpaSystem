import { useEffect, useRef, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PagedResponse } from '@spa/shared-types';
import { SearchXIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { NumberedPager } from '@/components/shared/NumberedPager/NumberedPager';
import { SimplePager } from '@/components/shared/SimplePager/SimplePager';
import { cn } from '@/lib/utils';
import { CatalogErrorState } from './CatalogErrorState';

const gridClass = 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3';

/** Lưới thẻ có đủ 4 trạng thái, số kết quả và phân trang; dùng cho danh sách dịch vụ và gói. */
export function CatalogGrid<T>({
  query,
  getKey,
  renderItem,
  resultLabel,
  emptyTitle,
  emptyFilteredTitle,
  hasFilters,
  onResetFilters,
  onPageChange,
  toolbar,
  pager = 'simple',
  framedToolbar = false,
}: {
  query: UseQueryResult<PagedResponse<T>>;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  resultLabel: (count: number) => ReactNode;
  emptyTitle: string;
  emptyFilteredTitle: string;
  hasFilters: boolean;
  onResetFilters: () => void;
  onPageChange: (page: number, options?: { replace?: boolean }) => void;
  toolbar?: ReactNode;
  /** `numbered`: Trang trước · 1 2 3 · Trang sau (SCR-W02); `simple`: Trang x/y (SCR-W04). */
  pager?: 'simple' | 'numbered';
  /** Đặt số kết quả và thanh công cụ trong một khung viền (SCR-W02). */
  framedToolbar?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const data = query.data;
  const lastPage = data && data.items.length === 0 && data.totalCount > 0 ? data.totalPages : 0;

  // URL trỏ quá trang cuối (sửa tay hoặc dữ liệu vừa giảm): về trang cuối.
  useEffect(() => {
    if (lastPage > 0) onPageChange(lastPage, { replace: true });
  }, [lastPage, onPageChange]);

  function changePage(page: number) {
    onPageChange(page);
    if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }

  let body: ReactNode;
  if (query.isPending)
    body = (
      <ul className={gridClass} aria-label="Đang tải">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} data-testid="catalog-card-skeleton" className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </li>
        ))}
      </ul>
    );
  else if (query.isError && !data)
    body = (
      <CatalogErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
        onResetFilters={onResetFilters}
      />
    );
  else if (!data || data.items.length === 0)
    body =
      lastPage > 0 ? null : hasFilters ? (
        <EmptyState
          icon={SearchXIcon}
          title={emptyFilteredTitle}
          description="Thử từ khóa khác hoặc bỏ bớt bộ lọc."
          action={
            <Button variant="outline" onClick={onResetFilters}>
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <EmptyState title={emptyTitle} />
      );
  else
    body = (
      <>
        <ul
          className={cn(gridClass, query.isPlaceholderData && 'opacity-60 transition-opacity')}
          aria-busy={query.isPlaceholderData}
        >
          {data.items.map((item) => (
            <li key={getKey(item)}>{renderItem(item)}</li>
          ))}
        </ul>
        {pager === 'numbered' ? (
          <NumberedPager
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            onPageChange={changePage}
          />
        ) : (
          <SimplePager
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            onPageChange={changePage}
          />
        )}
      </>
    );

  return (
    <section className="space-y-5" aria-labelledby="catalog-results">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3',
          framedToolbar && 'rounded-xl border bg-card px-4 py-3',
        )}
      >
        <h2
          id="catalog-results"
          ref={headingRef}
          tabIndex={-1}
          aria-live="polite"
          className="font-sans text-sm font-medium text-muted-foreground outline-none"
        >
          {data ? resultLabel(data.totalCount) : 'Kết quả'}
        </h2>
        {toolbar}
      </div>
      {body}
    </section>
  );
}
