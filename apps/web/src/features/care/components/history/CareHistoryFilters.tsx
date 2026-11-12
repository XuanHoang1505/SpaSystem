import { useEffect, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CareHistoryFiltersState } from './useCareHistoryFilters';

const SEARCH_MAX = 200;

/** Search (debounced 300 ms) and an optional date range; every change goes back to page 1. */
export function CareHistoryFilters({ filters }: { filters: CareHistoryFiltersState }) {
  const { table, fromDate, toDate, rangeError } = filters;
  const [searchInput, setSearchInput] = useState(table.search);

  useEffect(() => setSearchInput(table.search), [table.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== table.search) table.setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, table]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
      <div className="relative sm:w-72">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Tìm theo tên hoặc số điện thoại khách"
          placeholder="Tìm theo tên hoặc số điện thoại khách"
          value={searchInput}
          maxLength={SEARCH_MAX}
          onChange={(event) => setSearchInput(event.target.value)}
          className="h-9 pl-9 text-sm"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Label
          htmlFor="care-history-from"
          className="text-xs whitespace-nowrap text-muted-foreground"
        >
          Từ ngày
        </Label>
        <Input
          id="care-history-from"
          type="date"
          value={fromDate}
          onChange={(event) => table.setFilter('fromDate', event.target.value || null)}
          className="h-9 w-40 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Label
            htmlFor="care-history-to"
            className="text-xs whitespace-nowrap text-muted-foreground"
          >
            Đến ngày
          </Label>
          <Input
            id="care-history-to"
            type="date"
            value={toDate}
            onChange={(event) => table.setFilter('toDate', event.target.value || null)}
            aria-invalid={rangeError ? true : undefined}
            aria-describedby={rangeError ? 'care-history-to-error' : undefined}
            className="h-9 w-40 text-sm"
          />
        </div>
        {rangeError && (
          <p
            id="care-history-to-error"
            role="alert"
            className="text-xs font-medium text-destructive"
          >
            {rangeError}
          </p>
        )}
      </div>

      {table.hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput('');
            table.resetFilters();
          }}
          className="h-9 gap-1.5 self-start px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3.5" aria-hidden="true" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
