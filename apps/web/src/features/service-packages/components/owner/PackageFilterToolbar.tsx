import { useEffect, useState } from 'react';
import { PlusIcon, SearchIcon, XIcon } from 'lucide-react';
import type { CatalogStatus } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PackageFilterToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  status: CatalogStatus | '';
  onStatusChange: (status: CatalogStatus | '') => void;
  hasFilters: boolean;
  onReset: () => void;
  onOpenCreate: () => void;
}

export function PackageFilterToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  hasFilters,
  onReset,
  onOpenCreate,
}: PackageFilterToolbarProps) {
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        onSearchChange(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, onSearchChange]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Tìm kiếm gói dịch vụ"
            placeholder="Tìm tên gói dịch vụ..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Status filter */}
        <Select
          value={status || 'all'}
          onValueChange={(val) => onStatusChange(val === 'all' ? '' : (val as CatalogStatus))}
        >
          <SelectTrigger
            className="h-9 w-[160px] text-sm"
            aria-label="Lọc theo trạng thái"
          >
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="on_sale">Đang bán</SelectItem>
            <SelectItem value="discontinued">Ngừng bán</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset button */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
            Đặt lại
          </Button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onOpenCreate}
          className="h-9 gap-1.5 text-sm"
        >
          <PlusIcon className="size-4" />
          Tạo gói dịch vụ
        </Button>
      </div>
    </div>
  );
}
