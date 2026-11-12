import { XIcon } from 'lucide-react';
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
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { assignedStatuses, type AssignedFiltersState } from './useAssignedFilters';

/** Date range and status of SCR-W26; the range is checked before any call. */
export function AssignedAppointmentsFilters({ filters }: { filters: AssignedFiltersState }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
      <DateField
        id="assigned-from-date"
        label="Từ ngày"
        value={filters.from}
        error={filters.errors.from}
        onChange={(value) => filters.setRange(value, filters.to)}
      />
      <DateField
        id="assigned-to-date"
        label="Đến ngày"
        value={filters.to}
        error={filters.errors.to}
        onChange={(value) => filters.setRange(filters.from, value)}
      />

      <div className="flex flex-col gap-1.5 sm:w-48">
        <Label htmlFor="assigned-status" className="text-xs font-medium text-muted-foreground">
          Trạng thái
        </Label>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(value) =>
            filters.setStatus(assignedStatuses.find((status) => status === value))
          }
        >
          <SelectTrigger id="assigned-status" className="h-9 w-full text-sm">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {assignedStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {appointmentStatusBadge(status).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.isCustom && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={filters.reset}
          className="h-9 gap-1.5 self-start px-2.5 text-xs text-muted-foreground hover:text-foreground sm:mt-6"
        >
          <XIcon className="size-3.5" aria-hidden="true" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}

function DateField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5 sm:w-40">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-9 text-sm"
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
