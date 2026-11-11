import { useMemo } from 'react';
import { EyeIcon, ImageIcon, PencilIcon, PowerIcon, SparklesIcon } from 'lucide-react';
import type { ServiceListItem } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableRowAction,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDuration } from '@/lib/formatting/formatters';
import { catalogStatusBadge } from '../../catalogStatus';

export interface ServiceTableProps {
  data: readonly ServiceListItem[] | undefined;
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
  onSelectService: (service: ServiceListItem) => void;
  onEditService: (service: ServiceListItem) => void;
  onChangeImage: (service: ServiceListItem) => void;
  onToggleStatus: (service: ServiceListItem) => void;
}

export function ServiceTable({
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
  onSelectService,
  onEditService,
  onChangeImage,
  onToggleStatus,
}: ServiceTableProps) {
  const columns = useMemo<readonly DataTableColumn<ServiceListItem>[]>(
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
              <SparklesIcon className="size-5" />
            </div>
          ),
      },
      {
        id: 'name',
        header: 'Tên dịch vụ',
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
        id: 'category',
        header: 'Danh mục',
        hideBelow: 'sm',
        cell: (row) => <span className="text-sm text-muted-foreground">{row.category}</span>,
      },
      {
        id: 'duration',
        header: 'Thời lượng',
        hideBelow: 'md',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{formatDuration(row.durationMinutes)}</span>
        ),
      },
      {
        id: 'price',
        header: 'Giá niêm yết',
        cell: (row) => (
          <span className="font-medium text-foreground">{formatCurrency(row.price)}</span>
        ),
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

  const rowActions = (row: ServiceListItem): DataTableRowAction<ServiceListItem>[] => [
    {
      label: 'Xem chi tiết',
      icon: EyeIcon,
      onSelect: () => onSelectService(row),
    },
    {
      label: 'Sửa thông tin',
      icon: PencilIcon,
      onSelect: () => onEditService(row),
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
      title={hasFilters ? 'Không tìm thấy dịch vụ' : 'Chưa có dịch vụ nào'}
      description={
        hasFilters
          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Hãy tạo dịch vụ đầu tiên cho danh mục dịch vụ của spa.'
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
    <DataTable<ServiceListItem>
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Danh sách dịch vụ spa"
      page={page}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      onRowClick={(row) => onSelectService(row)}
      rowActions={rowActions}
      empty={empty}
    />
  );
}
