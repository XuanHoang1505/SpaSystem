import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PaginationParams } from '@spa/shared-types';
import { DEFAULT_PAGE_SIZE_OPTIONS } from './DataTablePagination';
import type { DataTableSort } from './dataTable.types';

const RESERVED = new Set(['page', 'pageSize', 'sortBy', 'sortDirection', 'search']);

export interface TableSearchParamsOptions {
  defaultPageSize?: number;
  defaultSort?: DataTableSort | null;
  pageSizeOptions?: readonly number[];
}

function positiveInt(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Giữ trang, số dòng, sắp xếp, từ khóa và bộ lọc của một bảng trên URL
 * (`?page=2&pageSize=20&sortBy=createdAtUtc&sortDirection=desc&search=…&status=…`)
 * để chia sẻ link và back/forward đúng. Đổi bộ lọc, từ khóa, sắp xếp hoặc số dòng thì về trang 1.
 */
export function useTableSearchParams({
  defaultPageSize = DEFAULT_PAGE_SIZE_OPTIONS[0],
  defaultSort = null,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TableSearchParamsOptions = {}) {
  const [params, setParams] = useSearchParams();

  const pageNumber = positiveInt(params.get('page')) ?? 1;
  const requestedSize = positiveInt(params.get('pageSize'));
  const pageSize =
    requestedSize && pageSizeOptions.includes(requestedSize) ? requestedSize : defaultPageSize;
  const search = params.get('search') ?? '';

  const sortBy = params.get('sortBy');
  const direction = params.get('sortDirection');
  // `sortBy=none` ghi nhận người dùng đã bỏ sắp xếp mặc định.
  const sort = useMemo<DataTableSort | null>(() => {
    if (sortBy === 'none') return null;
    if (sortBy) return { sortBy, sortDirection: direction === 'desc' ? 'desc' : 'asc' };
    return defaultSort;
  }, [sortBy, direction, defaultSort]);

  const update = useCallback(
    (changes: Record<string, string | null>, { resetPage = true, replace = false } = {}) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          if (resetPage) next.delete('page');
          return next;
        },
        { replace },
      );
    },
    [setParams],
  );

  /** `replace` sửa URL hiện tại thay vì thêm vào lịch sử (ví dụ tự về trang cuối khi trang vượt quá). */
  const setPage = useCallback(
    (page: number, { replace = false }: { replace?: boolean } = {}) =>
      update({ page: page > 1 ? String(page) : null }, { resetPage: false, replace }),
    [update],
  );
  const setPageSize = useCallback(
    (size: number) => update({ pageSize: size === defaultPageSize ? null : String(size) }),
    [update, defaultPageSize],
  );
  const setSort = useCallback(
    (value: DataTableSort | null) =>
      update(
        value
          ? { sortBy: value.sortBy, sortDirection: value.sortDirection }
          : { sortBy: defaultSort ? 'none' : null, sortDirection: null },
      ),
    [update, defaultSort],
  );
  const setSearch = useCallback(
    (value: string) => update({ search: value.trim() || null }, { replace: true }),
    [update],
  );
  const getFilter = useCallback((key: string) => params.get(key) ?? '', [params]);
  const setFilter = useCallback(
    (key: string, value: string | null) => {
      if (RESERVED.has(key)) throw new Error(`"${key}" is reserved by useTableSearchParams.`);
      update({ [key]: value });
    },
    [update],
  );
  /** Đổi nhiều bộ lọc trong một lần cập nhật URL (gọi `setFilter` liên tiếp sẽ ghi đè nhau). */
  const setFilters = useCallback(
    (changes: Record<string, string | null>) => {
      const reserved = Object.keys(changes).find((key) => RESERVED.has(key));
      if (reserved) throw new Error(`"${reserved}" is reserved by useTableSearchParams.`);
      update(changes);
    },
    [update],
  );
  const resetFilters = useCallback(
    () => setParams(new URLSearchParams(), { replace: false }),
    [setParams],
  );

  const hasFilters = search !== '' || [...params.keys()].some((key) => !RESERVED.has(key));

  /** Tham số gửi lên API (khớp `PagedQuery` của backend). */
  const query: PaginationParams = {
    pageNumber,
    pageSize,
    search: search || undefined,
    sortBy: sort?.sortBy,
    sortDirection: sort?.sortDirection,
  };

  return {
    pageNumber,
    pageSize,
    search,
    sort,
    query,
    hasFilters,
    setPage,
    setPageSize,
    setSort,
    setSearch,
    getFilter,
    setFilter,
    setFilters,
    resetFilters,
  };
}
