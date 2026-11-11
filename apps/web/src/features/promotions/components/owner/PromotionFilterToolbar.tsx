import { useEffect, useState } from 'react';
import { AlertCircleIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react';
import type { PromotionStatus } from '@spa/shared-types';
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

export interface PromotionFilterToolbarProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  status: PromotionStatus | '';
  onStatusChange: (status: PromotionStatus | '') => void;
  fromDate: string;
  onFromDateChange: (date: string) => void;
  toDate: string;
  onToDateChange: (date: string) => void;
  hasFilters: boolean;
  onReset: () => void;
  onOpenCreate: () => void;
}

export function PromotionFilterToolbar({
  search = '',
  onSearchChange,
  status,
  onStatusChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  hasFilters,
  onReset,
  onOpenCreate,
}: PromotionFilterToolbarProps) {
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (!onSearchChange) return;
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        onSearchChange(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, onSearchChange]);

  const isDateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search box if enabled */}
          {onSearchChange && (
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Tìm kiếm khuyến mãi"
                placeholder="Tìm mã hoặc mô tả..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          )}

          {/* Status filter */}
          <Select
            value={status || 'all'}
            onValueChange={(val) => onStatusChange(val === 'all' ? '' : (val as PromotionStatus))}
          >
            <SelectTrigger className="h-9 w-[170px] text-sm" aria-label="Lọc theo trạng thái">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Đang áp dụng</SelectItem>
              <SelectItem value="stopped">Tạm dừng</SelectItem>
            </SelectContent>
          </Select>

          {/* From date */}
          <div className="flex items-center gap-1.5">
            <Label htmlFor="promotions-from-date" className="text-xs text-muted-foreground shrink-0">
              Từ ngày
            </Label>
            <Input
              id="promotions-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              className="h-9 w-[145px] text-xs"
              aria-label="Từ ngày"
            />
          </div>

          {/* To date */}
          <div className="flex items-center gap-1.5">
            <Label htmlFor="promotions-to-date" className="text-xs text-muted-foreground shrink-0">
              Đến ngày
            </Label>
            <Input
              id="promotions-to-date"
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              className="h-9 w-[145px] text-xs"
              aria-label="Đến ngày"
            />
          </div>

          {/* Reset button */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
              <span>Đặt lại</span>
            </Button>
          )}
        </div>

        {/* CTA create promotion */}
        <Button onClick={onOpenCreate} className="h-9 gap-1.5 text-sm">
          <PlusIcon className="size-4" />
          <span>Tạo khuyến mãi</span>
        </Button>
      </div>

      {isDateRangeInvalid && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircleIcon className="size-3.5" />
          <span>Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.</span>
        </div>
      )}
    </div>
  );
}
