import { useEffect, useState } from 'react';
import { RotateCcwIcon, SearchIcon } from 'lucide-react';
import type { TreatmentPlanStatus } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStaffList } from '@/features/staff';

export interface TreatmentFilterToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  status: TreatmentPlanStatus | '';
  onStatusChange: (status: TreatmentPlanStatus | '') => void;
  staffId: string;
  onStaffIdChange: (staffId: string) => void;
  hasFilters: boolean;
  onReset: () => void;
}

export function TreatmentFilterToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  staffId,
  onStaffIdChange,
  hasFilters,
  onReset,
}: TreatmentFilterToolbarProps) {
  const [searchInput, setSearchInput] = useState(search);
  const staffQuery = useStaffList({ status: 'working' });
  const workingStaff = staffQuery.data?.items ?? [];

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
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Tìm theo tên khách, SĐT, gói..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 text-sm"
          aria-label="Tìm kiếm liệu trình"
        />
      </div>

      {/* Status Filter */}
      <div className="w-[180px]">
        <Select
          value={status || 'all'}
          onValueChange={(val) => onStatusChange(val === 'all' ? '' : (val as TreatmentPlanStatus))}
        >
          <SelectTrigger className="h-9 text-sm" aria-label="Lọc theo trạng thái">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="not_started">Chưa bắt đầu</SelectItem>
            <SelectItem value="in_progress">Đang thực hiện</SelectItem>
            <SelectItem value="paused">Tạm dừng</SelectItem>
            <SelectItem value="completed">Đã hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Staff Filter */}
      <div className="w-[200px]">
        <Select
          value={staffId || 'all'}
          onValueChange={(val) => onStaffIdChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger className="h-9 text-sm" aria-label="Lọc theo nhân viên phụ trách">
            <SelectValue placeholder="Tất cả nhân viên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhân viên</SelectItem>
            {workingStaff.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reset Filter Button */}
      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground h-9 gap-1.5 text-xs"
        >
          <RotateCcwIcon className="size-3.5" aria-hidden="true" />
          Đặt lại
        </Button>
      )}
    </div>
  );
}
