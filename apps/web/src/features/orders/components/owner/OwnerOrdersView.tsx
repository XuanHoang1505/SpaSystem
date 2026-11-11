import { useEffect, useMemo, useState } from 'react';
import { orderErrorCodes } from '@spa/api-client';
import { useTableSearchParams, type DataTableSort } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { orderErrorCode } from '../../errors';
import { useCancelManagedOrder } from '../../hooks/useCancelManagedOrder';
import { useManagedOrders } from '../../hooks/useManagedOrders';
import { CancelOrderDialog } from '../CancelOrderDialog';
import { OrdersBreadcrumb } from '../OrdersBreadcrumb';
import { OwnerOrderDetailSheet } from './OwnerOrderDetailSheet';
import { OrderFilterToolbar } from './OrderFilterToolbar';
import { OrderTable } from './OrderTable';
import { buildOrderSearchParams, toOrderStatus } from './ownerOrderParams';

const DEFAULT_SORT: DataTableSort = { sortBy: 'createdAtUtc', sortDirection: 'desc' };

const trail = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Quản trị spa', to: '/owner' },
  { label: 'Đơn hàng' },
];

/** SCR-W37: the owner searches, filters and sorts orders on the server (UC-SPA-13). */
export function OwnerOrdersView() {
  const table = useTableSearchParams({ defaultPageSize: 10, defaultSort: DEFAULT_SORT });
  const { pageNumber, pageSize, search, sort, getFilter, setFilter, setPage } = table;
  const status = toOrderStatus(getFilter('status')) ?? '';
  const fromDate = getFilter('fromDate');
  const toDate = getFilter('toDate');

  const { params, dateRangeInvalid } = useMemo(
    () => buildOrderSearchParams({ pageNumber, pageSize, search, status, fromDate, toDate, sort }),
    [pageNumber, pageSize, search, status, fromDate, toDate, sort],
  );
  const orders = useManagedOrders(params);
  const data = orders.data;
  const isPlaceholderData = orders.isPlaceholderData;

  // Only the answer to this very request decides that the page is past the end (not the previous one kept on screen).
  useEffect(() => {
    if (data && !isPlaceholderData && data.totalPages > 0 && pageNumber > data.totalPages)
      setPage(data.totalPages, { replace: true });
  }, [data, isPlaceholderData, pageNumber, setPage]);

  const [selectedOrder, setSelectedOrder] = useState<{ id: string; code: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; code: string } | null>(null);
  const cancelOrder = useCancelManagedOrder();

  // Rejected filters cannot succeed on a retry, so "Thử lại" resets them instead.
  const filtersRejected =
    orders.isError && orderErrorCode(orders.error) === orderErrorCodes.validationError;
  const listError = orders.isError
    ? filtersRejected
      ? 'Bộ lọc không hợp lệ.'
      : 'Không tải được danh sách đơn hàng.'
    : null;

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={trail} />
      <PageHeader
        title="Quản lý đơn hàng"
        description="Tìm đơn theo mã hoặc khách hàng, xem các lần thanh toán và hủy đơn chưa thanh toán."
        className="border-b pb-4"
      />
      <div className="space-y-4">
        <OrderFilterToolbar
          search={search}
          onSearchChange={table.setSearch}
          status={status}
          onStatusChange={(value) => setFilter('status', value || null)}
          fromDate={fromDate}
          onFromDateChange={(value) => setFilter('fromDate', value || null)}
          toDate={toDate}
          onToDateChange={(value) => setFilter('toDate', value || null)}
          dateRangeInvalid={dateRangeInvalid}
          hasFilters={table.hasFilters}
          onReset={table.resetFilters}
        />
        <OrderTable
          data={data?.items}
          page={
            data
              ? {
                  pageNumber: data.pageNumber,
                  pageSize: data.pageSize,
                  totalCount: data.totalCount,
                  totalPages: data.totalPages,
                }
              : undefined
          }
          isLoading={orders.isLoading}
          isFetching={orders.isFetching}
          error={listError}
          onRetry={filtersRejected ? table.resetFilters : () => void orders.refetch()}
          sort={sort}
          onSortChange={table.setSort}
          onPageChange={setPage}
          onPageSizeChange={table.setPageSize}
          hasFilters={table.hasFilters}
          onResetFilters={table.resetFilters}
          onSelectOrder={(row) => setSelectedOrder({ id: row.id, code: row.code })}
        />
      </div>
      <OwnerOrderDetailSheet
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onCancel={(detail) => setCancelTarget({ id: detail.id, code: detail.code })}
      />
      <CancelOrderDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        cancel={cancelOrder}
        description="Đơn sẽ chuyển sang Đã hủy, các lần thanh toán đang chờ hết hiệu lực và lịch giữ chỗ của đơn (nếu có) bị hủy. Thao tác không thể hoàn tác."
        onNotFound={() => setSelectedOrder(null)}
      />
    </section>
  );
}
