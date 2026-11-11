import { useMemo } from 'react';
import { CopyIcon, EyeIcon, PencilIcon, PowerIcon } from 'lucide-react';
import type { PromotionDto } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableRowAction,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { formatCurrency, formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { toast } from 'sonner';
import {
  formatPromotionDiscount,
  isPromotionExpired,
  promotionStatusBadge,
} from '../../promotionStatus';

function formatPromotionDate(utcString: string): string {
  try {
    return formatLocalDate(vietnamDateOf(utcString));
  } catch {
    return formatLocalDate(utcString);
  }
}

export interface PromotionTableProps {
  data: readonly PromotionDto[] | undefined;
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
  onSelectPromotion: (promotion: PromotionDto) => void;
  onEditPromotion: (promotion: PromotionDto) => void;
  onToggleStatus: (promotion: PromotionDto) => void;
}

export function PromotionTable({
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
  onSelectPromotion,
  onEditPromotion,
  onToggleStatus,
}: PromotionTableProps) {
  const columns = useMemo<readonly DataTableColumn<PromotionDto>[]>(
    () => [
      {
        id: 'code',
        header: 'Mã khuyến mãi',
        cell: (row) => (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold tracking-wide text-primary">
              {row.code}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard.writeText(row.code);
                toast.success(`Đã sao chép mã "${row.code}".`);
              }}
              className="rounded-md p-1 text-muted-foreground opacity-70 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus:outline-none"
              title="Sao chép mã"
              aria-label={`Sao chép mã ${row.code}`}
            >
              <CopyIcon className="size-3.5" />
            </button>
          </div>
        ),
      },
      {
        id: 'discount',
        header: 'Mức giảm',
        cell: (row) => (
          <span className="font-medium text-foreground">
            {formatPromotionDiscount(row.discountType, row.discountValue, row.maxDiscountAmount)}
          </span>
        ),
      },
      {
        id: 'minOrderAmount',
        header: 'Đơn tối thiểu',
        hideBelow: 'sm',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatCurrency(row.minOrderAmount)}
          </span>
        ),
      },
      {
        id: 'period',
        header: 'Thời gian áp dụng',
        hideBelow: 'md',
        cell: (row) => {
          const expired = isPromotionExpired(row.endsAtUtc);
          return (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>
                {formatPromotionDate(row.startsAtUtc)} – {formatPromotionDate(row.endsAtUtc)}
              </span>
              {expired && (
                <span className="inline-flex items-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                  Đã hết hạn
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'usage',
        header: 'Lượt dùng',
        hideBelow: 'lg',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.usedCount} / {row.usageLimit != null ? row.usageLimit : 'Không giới hạn'}
          </span>
        ),
      },
      {
        id: 'perCustomerLimit',
        header: 'Giới hạn/khách',
        className: 'hidden xl:table-cell',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.perCustomerLimit != null ? `${row.perCustomerLimit} lần` : 'Không giới hạn'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: (row) => {
          const badge = promotionStatusBadge[row.status];
          return <StatusBadge label={badge.label} tone={badge.tone} status={row.status} />;
        },
      },
    ],
    [],
  );

  const rowActions = (row: PromotionDto): DataTableRowAction<PromotionDto>[] => [
    {
      label: 'Xem chi tiết',
      icon: EyeIcon,
      onSelect: () => onSelectPromotion(row),
    },
    {
      label: 'Sửa thông tin',
      icon: PencilIcon,
      onSelect: () => onEditPromotion(row),
    },
    {
      label: row.status === 'active' ? 'Tạm dừng' : 'Kích hoạt lại',
      icon: PowerIcon,
      variant: row.status === 'active' ? 'destructive' : 'default',
      onSelect: () => onToggleStatus(row),
    },
  ];

  const empty = (
    <EmptyState
      title={hasFilters ? 'Không tìm thấy khuyến mãi' : 'Chưa có chương trình khuyến mãi nào'}
      description={
        hasFilters
          ? 'Thử thay đổi bộ lọc trạng thái hoặc khoảng ngày.'
          : 'Hãy tạo mã khuyến mãi đầu tiên để kích cầu dịch vụ và thu hút khách hàng.'
      }
      action={
        hasFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
          >
            Đặt lại bộ lọc
          </button>
        ) : undefined
      }
    />
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      caption="Danh sách chương trình khuyến mãi"
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      empty={empty}
      page={page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      onRowClick={onSelectPromotion}
      rowActions={rowActions}
    />
  );
}
