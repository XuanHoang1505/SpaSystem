import { useEffect, useState } from 'react';
import { AlertCircleIcon, SearchIcon, XIcon } from 'lucide-react';
import type { OrderStatus } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { orderStatusBadge } from '../../orderStatus';
import { ORDER_STATUSES } from './ownerOrderParams';

const SEARCH_MAX = 100;
const SEARCH_DELAY_MS = 300;
const ALL = 'all';

export interface OrderFilterToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  status: OrderStatus | '';
  onStatusChange: (status: OrderStatus | '') => void;
  fromDate: string;
  onFromDateChange: (date: string) => void;
  toDate: string;
  onToDateChange: (date: string) => void;
  dateRangeInvalid: boolean;
  hasFilters: boolean;
  onReset: () => void;
}

/** Search (debounced), status and creation-date range of the owner's order list. */
export function OrderFilterToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  dateRangeInvalid,
  hasFilters,
  onReset,
}: OrderFilterToolbarProps) {
  const [draft, setDraft] = useState(search);

  // Copy the URL value in only when it changed from outside; a trailing space being typed stays.
  useEffect(
    () => setDraft((previous) => (previous.trim() === search ? previous : search)),
    [search],
  );

  useEffect(() => {
    if (draft.trim() === search) return;
    const timer = setTimeout(() => onSearchChange(draft), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, search, onSearchChange]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="relative w-full sm:w-72">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Tìm đơn hàng"
            placeholder="Tìm mã đơn, tên, SĐT hoặc email khách…"
            maxLength={SEARCH_MAX}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        <Select
          value={status || ALL}
          onValueChange={(value) => onStatusChange(value === ALL ? '' : (value as OrderStatus))}
        >
          <SelectTrigger className="h-9 w-44 text-sm" aria-label="Lọc theo trạng thái">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
            {ORDER_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {orderStatusBadge(value).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="orders-from-date" className="shrink-0 text-xs text-muted-foreground">
            Từ ngày
          </Label>
          <Input
            id="orders-from-date"
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
            aria-invalid={dateRangeInvalid || undefined}
            className="h-9 w-36 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="orders-to-date" className="shrink-0 text-xs text-muted-foreground">
            Đến ngày
          </Label>
          <Input
            id="orders-to-date"
            type="date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
            aria-invalid={dateRangeInvalid || undefined}
            aria-describedby={dateRangeInvalid ? 'orders-date-error' : undefined}
            className="h-9 w-36 text-xs"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
            Đặt lại bộ lọc
          </Button>
        )}
      </div>

      {dateRangeInvalid && (
        <p id="orders-date-error" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircleIcon className="size-3.5" aria-hidden="true" />
          Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.
        </p>
      )}
    </div>
  );
}
