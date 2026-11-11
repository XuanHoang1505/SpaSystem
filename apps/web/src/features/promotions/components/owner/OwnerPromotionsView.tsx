import { useEffect, useMemo, useState } from 'react';
import type { PromotionDto, PromotionSearchParams, PromotionStatus } from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { OrdersBreadcrumb } from '@/features/orders';
import { usePromotionSearch } from '../../hooks/usePromotions';
import { PromotionDetailSheet } from './PromotionDetailSheet';
import { PromotionFilterToolbar } from './PromotionFilterToolbar';
import { PromotionFormDialog } from './PromotionFormDialog';
import { PromotionTable } from './PromotionTable';
import { TogglePromotionStatusDialog } from './TogglePromotionStatusDialog';

export function OwnerPromotionsView() {
  const {
    pageNumber,
    pageSize,
    search,
    setSearch,
    setPage,
    setPageSize,
    getFilter,
    setFilter,
    resetFilters,
    hasFilters,
  } = useTableSearchParams({ defaultPageSize: 10 });

  const status = (getFilter('status') as PromotionStatus) || '';
  const fromDate = getFilter('fromDate');
  const toDate = getFilter('toDate');

  // Prevent sending invalid date range to server
  const isDateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const queryParams = useMemo<PromotionSearchParams>(
    () => ({
      pageNumber,
      pageSize,
      search: search || undefined,
      status: status || undefined,
      fromDate: !isDateRangeInvalid && fromDate ? fromDate : undefined,
      toDate: !isDateRangeInvalid && toDate ? toDate : undefined,
    }),
    [pageNumber, pageSize, search, status, fromDate, toDate, isDateRangeInvalid],
  );

  const promotionsQuery = usePromotionSearch(queryParams);

  // Auto adjust page when out of bounds
  useEffect(() => {
    if (
      promotionsQuery.data &&
      promotionsQuery.data.totalPages > 0 &&
      pageNumber > promotionsQuery.data.totalPages
    ) {
      setPage(promotionsQuery.data.totalPages, { replace: true });
    }
  }, [promotionsQuery.data, pageNumber, setPage]);

  // Dialog & Sheet States
  const [detailPromotionId, setDetailPromotionId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<PromotionDto | null>(null);

  const breadcrumbTrail = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Quản trị spa', to: '/owner' },
    { label: 'Khuyến mãi' },
  ];

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={breadcrumbTrail} />

      <PageHeader
        title="Quản lý khuyến mãi"
        description="Tạo mã giảm giá, thiết lập điều kiện áp dụng, giới hạn lượt dùng và theo dõi hiệu quả khuyến mãi."
        className="border-b pb-4"
      />

      <div className="space-y-4 pt-1">
        <PromotionFilterToolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={(st) => setFilter('status', st || null)}
          fromDate={fromDate}
          onFromDateChange={(date) => setFilter('fromDate', date || null)}
          toDate={toDate}
          onToDateChange={(date) => setFilter('toDate', date || null)}
          hasFilters={hasFilters}
          onReset={resetFilters}
          onOpenCreate={() => {
            setEditingPromotionId(null);
            setFormOpen(true);
          }}
        />

        <PromotionTable
          data={promotionsQuery.data?.items}
          page={
            promotionsQuery.data
              ? {
                  pageNumber: promotionsQuery.data.pageNumber,
                  pageSize: promotionsQuery.data.pageSize,
                  totalCount: promotionsQuery.data.totalCount,
                  totalPages: promotionsQuery.data.totalPages,
                }
              : undefined
          }
          isLoading={promotionsQuery.isLoading}
          isFetching={promotionsQuery.isFetching}
          error={promotionsQuery.error ? 'Đã xảy ra lỗi khi tải danh sách khuyến mãi.' : null}
          onRetry={() => promotionsQuery.refetch()}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          onSelectPromotion={(promo) => setDetailPromotionId(promo.id)}
          onEditPromotion={(promo) => {
            setEditingPromotionId(promo.id);
            setFormOpen(true);
          }}
          onToggleStatus={(promo) => setStatusTarget(promo)}
        />
      </div>

      {/* Detail Sheet */}
      <PromotionDetailSheet
        promotionId={detailPromotionId}
        onClose={() => setDetailPromotionId(null)}
        onEdit={(detail) => {
          setDetailPromotionId(null);
          setEditingPromotionId(detail.id);
          setFormOpen(true);
        }}
        onToggleStatus={(detail) => {
          setStatusTarget(detail);
        }}
      />

      {/* Create / Edit Dialog */}
      <PromotionFormDialog
        promotionId={editingPromotionId}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPromotionId(null);
        }}
      />

      {/* Status Toggle Dialog */}
      <TogglePromotionStatusDialog
        promotion={statusTarget}
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      />
    </section>
  );
}
