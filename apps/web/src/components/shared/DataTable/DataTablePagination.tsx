import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DataTablePage } from './dataTable.types';

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export interface DataTablePaginationProps extends DataTablePage {
  onPageChange: (pageNumber: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
}

const numberFormat = new Intl.NumberFormat('vi-VN');

export function DataTablePagination({
  pageNumber,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  disabled = false,
}: DataTablePaginationProps) {
  const lastPage = Math.max(totalPages, 1);
  const from = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const to = Math.min(pageNumber * pageSize, totalCount);
  const canPrevious = !disabled && pageNumber > 1;
  const canNext = !disabled && pageNumber < lastPage;

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-col-reverse items-center justify-between gap-3 px-1 py-3 text-sm sm:flex-row"
    >
      <p className="text-muted-foreground" aria-live="polite">
        Hiển thị {numberFormat.format(from)}–{numberFormat.format(to)} trong{' '}
        {numberFormat.format(totalCount)}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground" id="data-table-page-size">
              Số dòng
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger size="sm" className="w-18" aria-labelledby="data-table-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="font-medium whitespace-nowrap">
          Trang {pageNumber}/{lastPage}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            aria-label="Trang đầu"
            disabled={!canPrevious}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Trang trước"
            disabled={!canPrevious}
            onClick={() => onPageChange(pageNumber - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Trang sau"
            disabled={!canNext}
            onClick={() => onPageChange(pageNumber + 1)}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            aria-label="Trang cuối"
            disabled={!canNext}
            onClick={() => onPageChange(lastPage)}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </nav>
  );
}
