import { useState } from 'react';
import type { CareHistoryItem } from '@spa/shared-types';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { OrdersBreadcrumb } from '@/features/orders';
import { careErrorMessage } from '../../errors';
import { useCareHistory } from '../../hooks/useCareQueries';
import { CareHistoryFilters } from './CareHistoryFilters';
import { CareHistoryTable } from './CareHistoryTable';
import { CareVisitSheet } from './CareVisitSheet';
import { useCareHistoryFilters } from './useCareHistoryFilters';

/** SCR-W28 (UC-SPA-26): the visits the staff member completed, newest first. */
export function CareHistoryView() {
  const filters = useCareHistoryFilters();
  const query = useCareHistory(filters.params);
  const [visit, setVisit] = useState<CareHistoryItem | null>(null);

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
      <OrdersBreadcrumb
        trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Lịch sử khách đã chăm sóc' }]}
      />
      <PageHeader
        title="Lịch sử khách đã chăm sóc"
        description="Các buổi chăm sóc bạn đã hoàn thành. Chọn một buổi để xem hồ sơ da và các lần trước của khách."
        className="border-b pb-4"
      />

      <CareHistoryFilters filters={filters} />

      <CareHistoryTable
        data={filters.params ? query.data : undefined}
        isLoading={filters.params !== null && query.isLoading}
        isFetching={query.isFetching}
        error={
          query.isError ? (careErrorMessage(query.error) ?? 'Không kết nối được máy chủ') : null
        }
        onRetry={() => void query.refetch()}
        hasFilters={filters.table.hasFilters}
        onResetFilters={filters.table.resetFilters}
        onPageChange={filters.table.setPage}
        onPageSizeChange={filters.table.setPageSize}
        onOpen={setVisit}
      />

      <CareVisitSheet visit={visit} onClose={() => setVisit(null)} onOpenVisit={setVisit} />
    </section>
  );
}
