import { useMemo } from 'react';
import type { CareHistoryParams } from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';

/** SCR-W28 filters on the URL: `search`, `fromDate`, `toDate`, `page`, `pageSize`. A reversed range sends nothing. */
export function useCareHistoryFilters() {
  const table = useTableSearchParams();
  const fromDate = table.getFilter('fromDate');
  const toDate = table.getFilter('toDate');
  const rangeError =
    fromDate && toDate && toDate < fromDate ? 'Đến ngày phải từ Từ ngày trở đi.' : undefined;

  const params = useMemo<CareHistoryParams | null>(
    () =>
      rangeError
        ? null
        : {
            pageNumber: table.pageNumber,
            pageSize: table.pageSize,
            search: table.search || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
    [rangeError, table.pageNumber, table.pageSize, table.search, fromDate, toDate],
  );

  return { table, fromDate, toDate, rangeError, params };
}

export type CareHistoryFiltersState = ReturnType<typeof useCareHistoryFilters>;
