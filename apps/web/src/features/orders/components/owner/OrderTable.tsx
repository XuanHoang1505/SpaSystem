import { EyeIcon } from 'lucide-react';
import type { OrderListItem } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableSort,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { paymentStatusBadge } from '@/features/payments/paymentStatus';
import { formatCurrency, formatDateTimeUtc } from '@/lib/formatting/formatters';
import { orderStatusBadge } from '../../orderStatus';

const columns: readonly DataTableColumn<OrderListItem>[] = [
  {
    id: 'code',
    header: 'Mã đơn',
    cell: (row) => (
      <div className="space-y-0.5">
        <p className="font-mono font-medium text-foreground">{row.code}</p>
        <p className="text-xs text-muted-foreground">{row.itemCount} sản phẩm</p>
      </div>
    ),
  },
  {
    id: 'customer',
    header: 'Khách hàng',
    cell: (row) => (
      <div className="space-y-0.5">
        <p className="font-medium text-foreground">{row.customer.fullName}</p>
        <p className="text-xs text-muted-foreground">{row.customer.phoneNumber}</p>
      </div>
    ),
  },
  {
    id: 'createdAtUtc',
    header: 'Ngày tạo',
    sortKey: 'createdAtUtc',
    hideBelow: 'md',
    className: 'whitespace-nowrap',
    cell: (row) => formatDateTimeUtc(row.createdAtUtc),
  },
  {
    id: 'grandTotal',
    header: 'Tổng thanh toán',
    sortKey: 'grandTotal',
    align: 'end',
    className: 'whitespace-nowrap',
    cell: (row) => (
      <div className="space-y-0.5">
        <p className="font-medium text-foreground">{formatCurrency(row.grandTotal)}</p>
        {row.promotionCode && (
          <Badge className="border-transparent bg-status-success font-mono text-[11px] text-status-success-foreground">
            {row.promotionCode}
          </Badge>
        )}
      </div>
    ),
  },
  {
    id: 'payments',
    header: 'Thanh toán',
    hideBelow: 'lg',
    cell: (row) =>
      row.latestPaymentStatus ? (
        <div className="flex items-center gap-2">
          <StatusBadge
            {...paymentStatusBadge(row.latestPaymentStatus)}
            status={row.latestPaymentStatus}
          />
          <span className="text-xs text-muted-foreground">{row.paymentCount} lần</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Chưa thanh toán</span>
      ),
  },
  {
    id: 'status',
    header: 'Trạng thái',
    cell: (row) => <StatusBadge {...orderStatusBadge(row.status)} status={row.status} />,
  },
];

export interface OrderTableProps {
  data: readonly OrderListItem[] | undefined;
  page: DataTablePage | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  onRetry: () => void;
  sort: DataTableSort | null;
  onSortChange: (sort: DataTableSort | null) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  onSelectOrder: (row: OrderListItem) => void;
}

/** The owner's order table; the detail (and cancelling) opens in a Sheet, never from the row menu. */
export function OrderTable({
  hasFilters,
  onResetFilters,
  onSelectOrder,
  ...table
}: OrderTableProps) {
  const empty = hasFilters ? (
    <EmptyState
      title="Không có đơn hàng phù hợp"
      description="Thử đổi từ khóa, trạng thái hoặc khoảng ngày."
      action={
        <Button variant="outline" size="sm" onClick={onResetFilters}>
          Đặt lại bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState
      title="Chưa có đơn hàng nào"
      description="Đơn hàng khách tạo khi thanh toán sẽ hiện ở đây."
    />
  );

  return (
    <DataTable
      {...table}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Danh sách đơn hàng"
      empty={empty}
      onRowClick={onSelectOrder}
      rowActions={() => [{ label: 'Xem chi tiết', icon: EyeIcon, onSelect: onSelectOrder }]}
    />
  );
}
