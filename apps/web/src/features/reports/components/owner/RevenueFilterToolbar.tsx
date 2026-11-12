import { useMemo } from 'react';
import { CalendarIcon, RotateCcwIcon, SlidersHorizontalIcon } from 'lucide-react';
import type { ReportProductType, RevenueGroupBy } from '@spa/shared-types';
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
import {
  getDatePresets,
  getVietnamToday,
  getVietnamYearStart,
  groupByLabels,
  productTypeLabels,
} from '../../formatters';

export interface RevenueFilterToolbarProps {
  readonly fromDate: string;
  readonly toDate: string;
  readonly groupBy: RevenueGroupBy;
  readonly productType: ReportProductType;
  readonly top: number;
  readonly onFiltersChange: (next: {
    fromDate?: string;
    toDate?: string;
    groupBy?: RevenueGroupBy;
    productType?: ReportProductType;
    top?: number;
  }) => void;
  readonly onReset: () => void;
  readonly isFetching?: boolean;
}

export function RevenueFilterToolbar({
  fromDate,
  toDate,
  groupBy,
  productType,
  top,
  onFiltersChange,
  onReset,
  isFetching: _isFetching,
}: RevenueFilterToolbarProps) {
  const today = useMemo(() => getVietnamToday(), []);
  const yearStart = useMemo(() => getVietnamYearStart(today), [today]);
  const presets = useMemo(() => getDatePresets(today), [today]);

  const activePresetId = useMemo(() => {
    const match = presets.find((p) => p.fromDate === fromDate && p.toDate === toDate);
    return match?.id ?? null;
  }, [fromDate, toDate, presets]);

  const isDefault =
    fromDate === yearStart &&
    toDate === today &&
    groupBy === 'month' &&
    productType === 'all' &&
    top === 10;

  const dateValidationError = useMemo(() => {
    if (fromDate && toDate && fromDate > toDate) {
      return 'Từ ngày không được lớn hơn Đến ngày';
    }
    return null;
  }, [fromDate, toDate]);

  return (
    <div className="space-y-3.5 rounded-xl border border-border/70 bg-muted/15 p-4 shadow-2xs">
      {/* Quick Presets Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 text-primary" />
            Chọn nhanh:
          </span>
          {presets.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <Button
                key={preset.id}
                type="button"
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={`h-7 rounded-full text-xs transition-all ${
                  isActive
                    ? 'shadow-xs font-medium'
                    : 'text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background'
                }`}
                onClick={() =>
                  onFiltersChange({
                    fromDate: preset.fromDate,
                    toDate: preset.toDate,
                  })
                }
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={isDefault}
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          title="Đặt lại bộ lọc về mặc định"
        >
          <RotateCcwIcon className="size-3.5" />
          <span>Đặt lại</span>
        </Button>
      </div>

      {/* Main Filter Controls */}
      <form
        noValidate
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {/* From Date */}
        <div className="space-y-1.5">
          <Label htmlFor="report-from-date" className="text-xs font-medium text-muted-foreground">
            Từ ngày
          </Label>
          <Input
            id="report-from-date"
            type="date"
            value={fromDate}
            onChange={(e) => onFiltersChange({ fromDate: e.target.value })}
            className="h-9 text-xs"
          />
        </div>

        {/* To Date */}
        <div className="space-y-1.5">
          <Label htmlFor="report-to-date" className="text-xs font-medium text-muted-foreground">
            Đến ngày
          </Label>
          <Input
            id="report-to-date"
            type="date"
            value={toDate}
            onChange={(e) => onFiltersChange({ toDate: e.target.value })}
            className="h-9 text-xs"
          />
        </div>

        {/* Group By */}
        <div className="space-y-1.5">
          <Label htmlFor="report-group-by" className="text-xs font-medium text-muted-foreground">
            Nhóm theo kỳ
          </Label>
          <Select
            value={groupBy}
            onValueChange={(val) => onFiltersChange({ groupBy: val as RevenueGroupBy })}
          >
            <SelectTrigger id="report-group-by" className="h-9 text-xs">
              <SelectValue placeholder="Nhóm theo" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(groupByLabels) as RevenueGroupBy[]).map((key) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {groupByLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Type */}
        <div className="space-y-1.5">
          <Label htmlFor="report-product-type" className="text-xs font-medium text-muted-foreground">
            Tiêu chí sản phẩm
          </Label>
          <Select
            value={productType}
            onValueChange={(val) => onFiltersChange({ productType: val as ReportProductType })}
          >
            <SelectTrigger id="report-product-type" className="h-9 text-xs">
              <SelectValue placeholder="Chọn tiêu chí" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(productTypeLabels) as ReportProductType[]).map((key) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {productTypeLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Top Products */}
        <div className="space-y-1.5">
          <Label htmlFor="report-top" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <SlidersHorizontalIcon className="size-3" />
            Top sản phẩm
          </Label>
          <Select
            value={String(top)}
            onValueChange={(val) => onFiltersChange({ top: Number(val) })}
          >
            <SelectTrigger id="report-top" className="h-9 text-xs">
              <SelectValue placeholder="Top" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10" className="text-xs">
                Top 10 sản phẩm
              </SelectItem>
              <SelectItem value="20" className="text-xs">
                Top 20 sản phẩm
              </SelectItem>
              <SelectItem value="50" className="text-xs">
                Top 50 sản phẩm
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>

      {dateValidationError && (
        <p className="text-xs font-medium text-destructive">{dateValidationError}</p>
      )}
    </div>
  );
}
