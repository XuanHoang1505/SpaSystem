import { RotateCcwIcon } from 'lucide-react';
import type { AppointmentStatus } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useServiceSearch } from '@/features/services/hooks/useServiceSearch';

export interface ServiceHistoryFilters {
  fromDate?: string;
  toDate?: string;
  spaServiceId?: string;
  status?: AppointmentStatus;
}

export function ServiceHistoryFilterToolbar({
  filters,
  onChange,
  onReset,
}: {
  filters: ServiceHistoryFilters;
  onChange: (filters: ServiceHistoryFilters) => void;
  onReset: () => void;
}) {
  const { data: serviceCatalog } = useServiceSearch({ pageSize: 50 });

  const hasFilters = Boolean(
    filters.fromDate || filters.toDate || filters.spaServiceId || filters.status,
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="space-y-1.5">
        <label htmlFor="from-date" className="text-xs font-medium text-muted-foreground">
          Từ ngày
        </label>
        <Input
          id="from-date"
          type="date"
          value={filters.fromDate ?? ''}
          onChange={(e) => onChange({ ...filters, fromDate: e.target.value || undefined })}
          className="w-36 text-xs sm:text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="to-date" className="text-xs font-medium text-muted-foreground">
          Đến ngày
        </label>
        <Input
          id="to-date"
          type="date"
          value={filters.toDate ?? ''}
          onChange={(e) => onChange({ ...filters, toDate: e.target.value || undefined })}
          className="w-36 text-xs sm:text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="service-select" className="text-xs font-medium text-muted-foreground">
          Dịch vụ
        </label>
        <select
          id="service-select"
          value={filters.spaServiceId ?? ''}
          onChange={(e) => onChange({ ...filters, spaServiceId: e.target.value || undefined })}
          className="h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
        >
          <option value="">Tất cả dịch vụ</option>
          {serviceCatalog?.items.map((svc) => (
            <option key={svc.id} value={svc.id}>
              {svc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="status-select" className="text-xs font-medium text-muted-foreground">
          Trạng thái
        </label>
        <select
          id="status-select"
          value={filters.status ?? ''}
          onChange={(e) =>
            onChange({
              ...filters,
              status: (e.target.value as AppointmentStatus) || undefined,
            })
          }
          className="h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="completed">Đã hoàn thành</option>
          <option value="no_show">Không đến</option>
        </select>
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-9 text-xs font-medium"
        >
          <RotateCcwIcon className="mr-1 size-3.5" aria-hidden="true" />
          Đặt lại
        </Button>
      )}
    </div>
  );
}
