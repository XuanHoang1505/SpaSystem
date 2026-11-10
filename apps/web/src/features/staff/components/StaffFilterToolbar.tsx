import { useEffect, useState } from 'react';
import { PlusIcon, SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServiceSearch } from '@/features/services/hooks/useServiceSearch';
import type { StaffStatusFilter } from '@spa/shared-types';

export interface StaffFilterToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  status: StaffStatusFilter | '';
  onStatusChange: (status: StaffStatusFilter | '') => void;
  spaServiceId: string;
  onSpaServiceIdChange: (spaServiceId: string) => void;
  onReset: () => void;
  onOpenCreate: () => void;
}

export function StaffFilterToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  spaServiceId,
  onSpaServiceIdChange,
  onReset,
  onOpenCreate,
}: StaffFilterToolbarProps) {
  const [searchInput, setSearchInput] = useState(search);
  const servicesQuery = useServiceSearch({ pageSize: 100 });
  const services = servicesQuery.data?.items ?? [];

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

  const hasActiveFilters = Boolean(search || status || spaServiceId);

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
            aria-label="Tìm theo tên, email hoặc số điện thoại"
            placeholder="Tìm tên, email, số điện thoại..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Status filter */}
        <Select
          value={status || 'all'}
          onValueChange={(val) => onStatusChange(val === 'all' ? '' : (val as StaffStatusFilter))}
        >
          <SelectTrigger
            className="h-9 w-[160px] text-sm"
            aria-label="Lọc theo trạng thái làm việc"
          >
            <SelectValue placeholder="Trạng thái làm việc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="working">Đang làm việc</SelectItem>
            <SelectItem value="resigned">Đã nghỉ việc</SelectItem>
          </SelectContent>
        </Select>

        {/* Service filter */}
        <Select
          value={spaServiceId || 'all'}
          onValueChange={(val) => onSpaServiceIdChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger
            className="h-9 max-w-[240px] min-w-[180px] text-sm"
            aria-label="Lọc theo dịch vụ"
          >
            <SelectValue placeholder="Tất cả dịch vụ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả dịch vụ</SelectItem>
            {services.map((svc) => (
              <SelectItem key={svc.id} value={svc.id}>
                {svc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset button */}
        {hasActiveFilters && (
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

      {/* Create staff button */}
      <Button onClick={onOpenCreate} className="h-9 gap-1.5 text-sm">
        <PlusIcon className="size-4" />
        Thêm nhân viên
      </Button>
    </div>
  );
}
