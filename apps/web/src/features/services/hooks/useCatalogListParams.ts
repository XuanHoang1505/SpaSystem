import { useCallback, useMemo } from 'react';
import type { ServiceSearchParams } from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';
import type { PriceRange } from '@/components/shared/PriceRangeFilter/PriceRangeFilter';

export type CatalogSortOption = 'name_asc' | 'price_asc' | 'price_desc';

export const catalogSortLabels: Record<CatalogSortOption, string> = {
  name_asc: 'Tên A–Z',
  price_asc: 'Giá tăng dần',
  price_desc: 'Giá giảm dần',
};

export const CATALOG_PAGE_SIZE = 12;
const PAGE_SIZE_OPTIONS = [CATALOG_PAGE_SIZE] as const;
const DEFAULT_SORT = { sortBy: 'name', sortDirection: 'asc' } as const;

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** URL value → whole VND ≥ 0, or undefined when missing/invalid (the param is then ignored). */
function amount(value: string) {
  return /^\d+$/.test(value) ? Number(value) : undefined;
}

/**
 * Filters of the catalog lists kept on the URL (`search`, `categoryId`, `minPrice`, `maxPrice`,
 * `sortBy`/`sortDirection`, `page`); any change goes back to page 1.
 */
export function useCatalogListParams() {
  const table = useTableSearchParams({
    defaultPageSize: CATALOG_PAGE_SIZE,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    defaultSort: DEFAULT_SORT,
  });
  const { getFilter, setFilter, setFilters, setSort: setTableSort } = table;

  // Q-13: categories are filtered by id; a non-GUID value (or an old `?category=Tên` link) is ignored.
  const rawCategoryId = getFilter('categoryId');
  const categoryId = GUID.test(rawCategoryId) ? rawCategoryId : undefined;
  const minPrice = amount(getFilter('minPrice'));
  const maxPrice = amount(getFilter('maxPrice'));
  const sort: CatalogSortOption =
    table.sort?.sortBy === 'price'
      ? table.sort.sortDirection === 'desc'
        ? 'price_desc'
        : 'price_asc'
      : 'name_asc';

  const query = useMemo<ServiceSearchParams>(
    () => ({ ...table.query, categoryId, minPrice, maxPrice }),
    [table.query, categoryId, minPrice, maxPrice],
  );

  const setCategoryId = useCallback(
    (value: string | null) => setFilter('categoryId', value),
    [setFilter],
  );
  const setPriceRange = useCallback(
    ({ min, max }: PriceRange) =>
      setFilters({ minPrice: min?.toString() ?? null, maxPrice: max?.toString() ?? null }),
    [setFilters],
  );
  /** Loại dịch vụ + khoảng giá trong một lần cập nhật URL (nút "Áp dụng bộ lọc"). */
  const applyFilters = useCallback(
    (values: { categoryId?: string; minPrice?: number; maxPrice?: number }) =>
      setFilters({
        categoryId: values.categoryId ?? null,
        minPrice: values.minPrice?.toString() ?? null,
        maxPrice: values.maxPrice?.toString() ?? null,
      }),
    [setFilters],
  );
  const setSort = useCallback(
    (option: CatalogSortOption) =>
      setTableSort(
        option === 'name_asc'
          ? DEFAULT_SORT
          : { sortBy: 'price', sortDirection: option === 'price_desc' ? 'desc' : 'asc' },
      ),
    [setTableSort],
  );

  return {
    pageNumber: table.pageNumber,
    search: table.search,
    categoryId,
    minPrice,
    maxPrice,
    sort,
    hasFilters: table.hasFilters,
    query,
    setSearch: table.setSearch,
    setCategoryId,
    setPriceRange,
    applyFilters,
    setSort,
    setPage: table.setPage,
    resetFilters: table.resetFilters,
  };
}
