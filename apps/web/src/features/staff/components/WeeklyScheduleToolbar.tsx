import { ChevronLeftIcon, ChevronRightIcon, LayersIcon, PlusIcon } from 'lucide-react';
import type { WorkScheduleStatus } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkingStaff } from '@/features/bookings/hooks/owner/useWorkingStaff';
import { formatLocalDate } from '@/lib/formatting/formatters';

export interface WeeklyScheduleToolbarProps {
  fromDate: string;
  toDate: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  staffMemberId: string;
  onStaffMemberIdChange: (id: string) => void;
  status: WorkScheduleStatus | '';
  onStatusChange: (status: WorkScheduleStatus | '') => void;
  onOpenCreateShift: () => void;
  onOpenCreateBatch: () => void;
}

export function WeeklyScheduleToolbar({
  fromDate,
  toDate,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  staffMemberId,
  onStaffMemberIdChange,
  status,
  onStatusChange,
  onOpenCreateShift,
  onOpenCreateBatch,
}: WeeklyScheduleToolbarProps) {
  const staffQuery = useWorkingStaff();
  const staffMembers = staffQuery.data?.items ?? [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Navigation Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border bg-card p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onPrevWeek}
            aria-label="Tuần trước"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold"
            onClick={onCurrentWeek}
          >
            Tuần này
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onNextWeek}
            aria-label="Tuần sau"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <span className="px-1 text-sm font-medium text-foreground">
          {formatLocalDate(fromDate)} – {formatLocalDate(toDate)}
        </span>

        {/* Staff Filter */}
        <Select
          value={staffMemberId || 'all'}
          onValueChange={(val) => onStaffMemberIdChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger className="h-9 w-[180px] text-sm" aria-label="Lọc theo nhân viên">
            <SelectValue placeholder="Tất cả nhân viên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhân viên</SelectItem>
            {staffMembers.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={status || 'all'}
          onValueChange={(val) => onStatusChange(val === 'all' ? '' : (val as WorkScheduleStatus))}
        >
          <SelectTrigger className="h-9 w-[140px] text-sm" aria-label="Lọc trạng thái ca">
            <SelectValue placeholder="Trạng thái ca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả ca</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCreateBatch}
          className="h-9 gap-1.5 text-xs sm:text-sm"
        >
          <LayersIcon className="size-3.5" />
          Phân ca hàng loạt
        </Button>
        <Button size="sm" onClick={onOpenCreateShift} className="h-9 gap-1.5 text-xs sm:text-sm">
          <PlusIcon className="size-4" />
          Phân ca lẻ
        </Button>
      </div>
    </div>
  );
}
