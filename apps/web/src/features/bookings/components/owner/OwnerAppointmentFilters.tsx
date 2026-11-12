import { useEffect, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
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
import { addDays, vietnamNow } from '@/lib/formatting/vietnamTime';
import { appointmentStatusBadge, appointmentStatuses } from '../../appointmentStatus';
import { useWorkingStaff } from '../../hooks/owner/useWorkingStaff';
import type { OwnerAppointmentFiltersState } from './useOwnerAppointmentFilters';

export function OwnerAppointmentFilters({
  filters,
  today,
}: {
  filters: OwnerAppointmentFiltersState;
  today?: string;
}) {
  const todayDate = today ?? vietnamNow().date;
  const [searchInput, setSearchInput] = useState(filters.search);
  const staffQuery = useWorkingStaff();

  // Keep local search input in sync if URL search changes externally (e.g. back/forward, reset)
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        filters.setSearch(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters]);

  const commonFilters = (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Search */}
      <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Tìm theo tên hoặc số điện thoại khách"
          placeholder="Tìm theo tên hoặc số điện thoại khách"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 pl-9 text-sm"
        />
      </div>

      {/* Staff */}
      <div className="w-44">
        <Select
          value={filters.staffMemberId ?? 'all'}
          onValueChange={(val) => filters.setStaff(val === 'all' ? null : val)}
          disabled={staffQuery.isError}
        >
          <SelectTrigger aria-label="Lọc theo nhân viên" className="h-9 w-full text-sm">
            <SelectValue placeholder="Tất cả nhân viên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhân viên</SelectItem>
            {staffQuery.data?.items.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="w-44">
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(val) =>
            filters.setStatus(val === 'all' ? null : (val as (typeof appointmentStatuses)[number]))
          }
        >
          <SelectTrigger aria-label="Lọc theo trạng thái" className="h-9 w-full text-sm">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {appointmentStatuses.map((st) => (
              <SelectItem key={st} value={st}>
                {appointmentStatusBadge(st).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear filters */}
      {filters.hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={filters.reset}
          className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3.5" aria-hidden="true" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Hàng 1: Điều khiển thời gian */}
      {filters.view === 'list' ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <Label
              htmlFor="owner-filter-from-date"
              className="text-xs font-medium whitespace-nowrap text-muted-foreground"
            >
              Từ ngày
            </Label>
            <Input
              id="owner-filter-from-date"
              type="date"
              value={filters.fromDate}
              onChange={(e) => filters.setRange(e.target.value, filters.toDate)}
              className="h-9 w-36 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label
              htmlFor="owner-filter-to-date"
              className="text-xs font-medium whitespace-nowrap text-muted-foreground"
            >
              Đến ngày
            </Label>
            <Input
              id="owner-filter-to-date"
              type="date"
              value={filters.toDate}
              onChange={(e) => filters.setRange(filters.fromDate, e.target.value)}
              className="h-9 w-36 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => filters.setRange(todayDate, todayDate)}
              className="h-9 px-3 text-xs sm:text-sm"
            >
              Hôm nay
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => filters.setRange(todayDate, addDays(todayDate, 6))}
              className="h-9 px-3 text-xs sm:text-sm"
            >
              7 ngày tới
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => filters.setRange(todayDate, addDays(todayDate, 29))}
              className="h-9 px-3 text-xs sm:text-sm"
            >
              30 ngày tới
            </Button>
          </div>
          {filters.rangeError && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {filters.rangeError}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => filters.setDate(addDays(filters.date, -1))}
            className="h-9 px-3 text-xs sm:text-sm"
          >
            Hôm trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => filters.setDate(todayDate)}
            className="h-9 px-3 text-xs sm:text-sm"
          >
            Hôm nay
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => filters.setDate(addDays(filters.date, 1))}
            className="h-9 px-3 text-xs sm:text-sm"
          >
            Hôm sau
          </Button>
          <Input
            aria-label="Chọn ngày xem lịch"
            type="date"
            value={filters.date}
            onChange={(e) => filters.setDate(e.target.value)}
            className="h-9 w-40 text-sm"
          />
        </div>
      )}

      {/* Hàng 2: Tìm kiếm, nhân viên, trạng thái, xóa bộ lọc */}
      {commonFilters}
    </div>
  );
}
