import { useEffect, useMemo, useState } from 'react';
import type {
  TreatmentPlanDto,
  TreatmentPlanListItemDto,
  TreatmentPlanStatus,
  TreatmentSearchParams,
  TreatmentSessionDto,
} from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { OrdersBreadcrumb } from '@/features/orders';
import { useOwnerTreatmentSearch } from '../../hooks/useOwnerTreatments';
import { AssignTreatmentStaffDialog } from './AssignTreatmentStaffDialog';
import { ChangeTreatmentStatusDialog } from './ChangeTreatmentStatusDialog';
import { TreatmentDetailSheet } from './TreatmentDetailSheet';
import { TreatmentFilterToolbar } from './TreatmentFilterToolbar';
import { TreatmentTable } from './TreatmentTable';
import { UpdateSessionNoteDialog } from './UpdateSessionNoteDialog';
import { UpdateTreatmentDialog } from './UpdateTreatmentDialog';

export function OwnerTreatmentsView() {
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

  const status = (getFilter('status') as TreatmentPlanStatus) || '';
  const staffId = getFilter('staffId') || '';

  const queryParams = useMemo<TreatmentSearchParams>(
    () => ({
      pageNumber,
      pageSize,
      search: search || undefined,
      status: status || undefined,
      primaryStaffMemberId: staffId || undefined,
    }),
    [pageNumber, pageSize, search, status, staffId],
  );

  const treatmentsQuery = useOwnerTreatmentSearch(queryParams);

  // Auto adjust page when out of bounds
  useEffect(() => {
    if (
      treatmentsQuery.data &&
      treatmentsQuery.data.totalPages > 0 &&
      pageNumber > treatmentsQuery.data.totalPages
    ) {
      setPage(treatmentsQuery.data.totalPages, { replace: true });
    }
  }, [treatmentsQuery.data, pageNumber, setPage]);

  // Dialog & Sheet States
  const [detailTreatmentId, setDetailTreatmentId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TreatmentPlanDto | TreatmentPlanListItemDto | null>(
    null,
  );
  const [assignStaffTarget, setAssignStaffTarget] = useState<
    TreatmentPlanDto | TreatmentPlanListItemDto | null
  >(null);
  const [statusTarget, setStatusTarget] = useState<
    TreatmentPlanDto | TreatmentPlanListItemDto | null
  >(null);
  const [sessionNoteTarget, setSessionNoteTarget] = useState<{
    treatmentId: string;
    session: TreatmentSessionDto;
  } | null>(null);

  const breadcrumbTrail = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Quản trị spa', to: '/owner' },
    { label: 'Liệu trình' },
  ];

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={breadcrumbTrail} />

      <PageHeader
        title="Quản lý phác đồ điều trị"
        description="Theo dõi tiến độ, phác đồ buổi trị liệu, hồ sơ da và lịch sử chăm sóc của khách hàng."
        className="border-b pb-4"
      />

      <div className="space-y-4 pt-1">
        <TreatmentFilterToolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={(st) => setFilter('status', st || null)}
          staffId={staffId}
          onStaffIdChange={(id) => setFilter('staffId', id || null)}
          hasFilters={hasFilters}
          onReset={resetFilters}
        />

        <TreatmentTable
          data={treatmentsQuery.data?.items}
          page={
            treatmentsQuery.data
              ? {
                  pageNumber: treatmentsQuery.data.pageNumber,
                  pageSize: treatmentsQuery.data.pageSize,
                  totalCount: treatmentsQuery.data.totalCount,
                  totalPages: treatmentsQuery.data.totalPages,
                }
              : undefined
          }
          isLoading={treatmentsQuery.isLoading}
          isFetching={treatmentsQuery.isFetching}
          error={treatmentsQuery.error ? 'Đã xảy ra lỗi khi tải danh sách liệu trình.' : null}
          onRetry={() => treatmentsQuery.refetch()}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          onSelectTreatment={(treatment) => setDetailTreatmentId(treatment.id)}
          onEditTreatment={(treatment) => setEditTarget(treatment)}
          onAssignStaff={(treatment) => setAssignStaffTarget(treatment)}
          onChangeStatus={(treatment) => setStatusTarget(treatment)}
        />
      </div>

      {/* Detail Sheet */}
      <TreatmentDetailSheet
        treatmentId={detailTreatmentId}
        onClose={() => setDetailTreatmentId(null)}
        onEditTreatment={(detail) => setEditTarget(detail)}
        onAssignStaff={(detail) => setAssignStaffTarget(detail)}
        onChangeStatus={(detail) => setStatusTarget(detail)}
        onEditSessionNote={(treatmentId, session) =>
          setSessionNoteTarget({ treatmentId, session })
        }
      />

      {/* Update Treatment Dialog */}
      <UpdateTreatmentDialog
        treatment={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      {/* Assign Treatment Staff Dialog */}
      <AssignTreatmentStaffDialog
        treatment={assignStaffTarget}
        open={Boolean(assignStaffTarget)}
        onOpenChange={(open) => {
          if (!open) setAssignStaffTarget(null);
        }}
      />

      {/* Change Treatment Status Dialog */}
      <ChangeTreatmentStatusDialog
        treatment={statusTarget}
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      />

      {/* Update Session Note Dialog */}
      <UpdateSessionNoteDialog
        treatmentId={sessionNoteTarget?.treatmentId ?? ''}
        session={sessionNoteTarget?.session ?? null}
        open={Boolean(sessionNoteTarget)}
        onOpenChange={(open) => {
          if (!open) setSessionNoteTarget(null);
        }}
      />
    </section>
  );
}
