import { useMemo } from 'react';
import { EyeIcon, ImageIcon, PackageIcon, PencilIcon, PowerIcon } from 'lucide-react';
import type { PackageListItem } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableRowAction,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { catalogStatusBadge } from '@/features/services';
import { formatCurrency, formatLocalDate } from '@/lib/formatting/formatters';
import { savingPercent } from '../../coursePlan';

export interface PackageTableProps {
  data: readonly PackageListItem[] | undefined;
  page?: DataTablePage;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPageChange?: (pageNumber: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  hasFilters: boolean;
  onResetFilters: () => void;
  onSelectPackage: (pkg: PackageListItem) => void;
  onEditPackage: (pkg: PackageListItem) => void;
  onChangeImage: (pkg: PackageListItem) => void;
  onToggleStatus: (pkg: PackageListItem) => void;
}

export function PackageTable({
  data,
  page,
  isLoading,
  isFetching,
  error,
  onRetry,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  hasFilters,
  onResetFilters,
  onSelectPackage,
  onEditPackage,
  onChangeImage,
  onToggleStatus,
}: PackageTableProps) {
  const columns = useMemo<readonly DataTableColumn<PackageListItem>[]>(
    () => [
      {
        id: 'image',
        header: 'Ảnh',
        className: 'w-14',
        cell: (row) =>
          row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt={row.name}
              className="size-10 rounded-lg border object-cover"
            />
          ) : (
            <div
              className="flex size-10 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
              aria-label="Chưa có ảnh"
            >
              <PackageIcon className="size-5" />
            </div>
          ),
      },
      {
        id: 'name',
        header: 'Tên gói dịch vụ',
        cell: (row) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">{row.name}</span>
            {row.shortDescription && (
              <span className="truncate text-xs text-muted-foreground" title={row.shortDescription}>
                {row.shortDescription}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'totalSessions',
        header: 'Số buổi',
        hideBelow: 'sm',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{row.totalSessions} buổi</span>
        ),
      },
      {
        id: 'validityDays',
        header: 'Thời hạn',
        hideBelow: 'md',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{row.validityDays} ngày</span>
        ),
      },
      {
        id: 'pricing',
        header: 'Giá gói',
        cell: (row) => {
          const discount = savingPercent(row.price, row.retailPrice);
          const hasDiscount = row.retailPrice > row.price;

          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{formatCurrency(row.price)}</span>
              {hasDiscount && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(row.retailPrice)}
                  </span>
                  {discount > 0 && (
                    <span className="rounded-sm bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">
                      -{discount}%
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'salePeriod',
        header: 'Thời gian mở bán',
        hideBelow: 'lg',
        cell: (row) => {
          let text = 'Không giới hạn';
          if (row.saleStartDate && row.saleEndDate) {
            text = `${formatLocalDate(row.saleStartDate)} - ${formatLocalDate(row.saleEndDate)}`;
          } else if (row.saleStartDate) {
            text = `Từ ${formatLocalDate(row.saleStartDate)}`;
          } else if (row.saleEndDate) {
            text = `Đến ${formatLocalDate(row.saleEndDate)}`;
          }
          return <span className="text-sm text-muted-foreground">{text}</span>;
        },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: (row) => {
          const badge = catalogStatusBadge[row.status];
          return <StatusBadge label={badge.label} tone={badge.tone} status={row.status} />;
        },
      },
    ],
    [],
  );

  const rowActions = (row: PackageListItem): DataTableRowAction<PackageListItem>[] => [
    {
      label: 'Xem chi tiết',
      icon: EyeIcon,
      onSelect: () => onSelectPackage(row),
    },
    {
      label: 'Sửa gói dịch vụ',
      icon: PencilIcon,
      onSelect: () => onEditPackage(row),
    },
    {
      label: 'Đổi ảnh đại diện',
      icon: ImageIcon,
      onSelect: () => onChangeImage(row),
    },
    {
      label: row.status === 'on_sale' ? 'Ngừng bán' : 'Mở bán lại',
      icon: PowerIcon,
      variant: row.status === 'on_sale' ? 'destructive' : 'default',
      onSelect: () => onToggleStatus(row),
    },
  ];

  const empty = (
    <EmptyState
      title={hasFilters ? 'Không tìm thấy gói dịch vụ' : 'Chưa có gói dịch vụ nào'}
      description={
        hasFilters
          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Hãy tạo gói dịch vụ đầu tiên để thu hút khách hàng.'
      }
      action={
        hasFilters ? (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Đặt lại bộ lọc
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <DataTable<PackageListItem>
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Danh sách gói dịch vụ spa"
      page={page}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      onRowClick={(row) => onSelectPackage(row)}
      rowActions={rowActions}
      empty={empty}
    />
  );
}
