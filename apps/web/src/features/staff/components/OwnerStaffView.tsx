import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  StaffDetail,
  StaffListItem,
  StaffStatusFilter,
  WorkScheduleBatchResult,
  WorkScheduleItem,
  WorkScheduleStatus,
} from '@spa/shared-types';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrdersBreadcrumb } from '@/features/orders';
import { addDays, vietnamNow } from '@/lib/formatting/vietnamTime';
import { useStaffList } from '../hooks/useStaffList';
import { useWorkSchedules } from '../hooks/useWorkSchedules';
import { getWeekRange } from '../scheduleUtils';
import { BatchResultDialog } from './BatchResultDialog';
import { CancelShiftDialog } from './CancelShiftDialog';
import { CreateBatchShiftsDialog } from './CreateBatchShiftsDialog';
import { CreateShiftDialog } from './CreateShiftDialog';
import { CreateStaffDialog } from './CreateStaffDialog';
import { EditShiftDialog } from './EditShiftDialog';
import { EditStaffDialog } from './EditStaffDialog';
import { ResignStaffDialog } from './ResignStaffDialog';
import { StaffDetailSheet } from './StaffDetailSheet';
import { StaffFilterToolbar } from './StaffFilterToolbar';
import { StaffTable } from './StaffTable';
import { UpdateStaffServicesDialog } from './UpdateStaffServicesDialog';
import { WeeklyScheduleGrid } from './WeeklyScheduleGrid';
import { WeeklyScheduleToolbar } from './WeeklyScheduleToolbar';

export function OwnerStaffView() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab
  const activeTab = (searchParams.get('tab') as 'staff' | 'schedule') || 'staff';
  const setActiveTab = (tab: 'staff' | 'schedule') => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'staff') {
          next.delete('tab');
        } else {
          next.set('tab', tab);
        }
        return next;
      },
      { replace: true },
    );
  };

  // Staff Filters
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10));
  const search = searchParams.get('search') || '';
  const status = (searchParams.get('status') as StaffStatusFilter) || '';
  const spaServiceId = searchParams.get('spaServiceId') || '';

  const updateStaffFilter = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
          if (key !== 'page') {
            next.delete('page');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleResetStaffFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('search');
        next.delete('status');
        next.delete('spaServiceId');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  const staffQueryParams = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      search: search || undefined,
      status: status || undefined,
      spaServiceId: spaServiceId || undefined,
    }),
    [page, pageSize, search, status, spaServiceId],
  );

  const staffListQuery = useStaffList(staffQueryParams);

  // If page exceeds totalPages, navigate to last page
  useEffect(() => {
    if (
      activeTab === 'staff' &&
      staffListQuery.data &&
      staffListQuery.data.totalPages > 0 &&
      page > staffListQuery.data.totalPages
    ) {
      updateStaffFilter('page', String(staffListQuery.data.totalPages));
    }
  }, [activeTab, staffListQuery.data, page, updateStaffFilter]);

  // Schedule Filters
  const today = vietnamNow().date;
  const weekBaseDate = searchParams.get('week') || today;
  const scheduleStaff = searchParams.get('scheduleStaff') || '';
  const scheduleStatus = (searchParams.get('scheduleStatus') as WorkScheduleStatus) || '';

  const { fromDate, toDate, days } = useMemo(() => getWeekRange(weekBaseDate), [weekBaseDate]);

  const setWeekBaseDate = (newDate: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (newDate === today) {
          next.delete('week');
        } else {
          next.set('week', newDate);
        }
        return next;
      },
      { replace: true },
    );
  };

  const updateScheduleFilter = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  };

  const scheduleQueryParams = useMemo(
    () => ({
      fromDate,
      toDate,
      staffMemberId: scheduleStaff || undefined,
      status: scheduleStatus || undefined,
    }),
    [fromDate, toDate, scheduleStaff, scheduleStatus],
  );

  const schedulesQuery = useWorkSchedules(scheduleQueryParams);

  // Dialog States - Staff
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [createStaffOpen, setCreateStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffListItem | StaffDetail | null>(null);
  const [updatingServicesStaff, setUpdatingServicesStaff] = useState<
    StaffListItem | StaffDetail | null
  >(null);
  const [resigningStaff, setResigningStaff] = useState<StaffListItem | StaffDetail | null>(null);

  // Dialog States - Schedules
  const [createShiftOpen, setCreateShiftOpen] = useState(false);
  const [createShiftDefaultDate, setCreateShiftDefaultDate] = useState<string | undefined>(
    undefined,
  );
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  const [batchResult, setBatchResult] = useState<WorkScheduleBatchResult | null>(null);
  const [editingShift, setEditingShift] = useState<WorkScheduleItem | null>(null);
  const [cancellingShift, setCancellingShift] = useState<WorkScheduleItem | null>(null);

  const breadcrumbTrail = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Tài khoản', to: '/account' },
    { label: 'Nhân viên & lịch làm việc' },
  ];

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={breadcrumbTrail} />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'staff' | 'schedule')}
        className="space-y-6"
      >
        <PageHeader
          title="Nhân viên & lịch làm việc"
          description="Quản lý hồ sơ nhân viên spa và phân công ca làm việc theo tuần."
          className="border-b pb-4 sm:items-center"
          actions={
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="staff">Nhân viên</TabsTrigger>
              <TabsTrigger value="schedule">Lịch làm việc</TabsTrigger>
            </TabsList>
          }
        />

        {/* Tab Staff Management (UC-SPA-22) */}
        <TabsContent value="staff" className="space-y-4 pt-1">
          <StaffFilterToolbar
            search={search}
            onSearchChange={(val) => updateStaffFilter('search', val)}
            status={status}
            onStatusChange={(val) => updateStaffFilter('status', val)}
            spaServiceId={spaServiceId}
            onSpaServiceIdChange={(val) => updateStaffFilter('spaServiceId', val)}
            onReset={handleResetStaffFilters}
            onOpenCreate={() => setCreateStaffOpen(true)}
          />

          <StaffTable
            data={staffListQuery.data?.items}
            page={
              staffListQuery.data
                ? {
                    pageNumber: staffListQuery.data.pageNumber,
                    pageSize: staffListQuery.data.pageSize,
                    totalCount: staffListQuery.data.totalCount,
                    totalPages: staffListQuery.data.totalPages,
                  }
                : undefined
            }
            isLoading={staffListQuery.isLoading}
            isFetching={staffListQuery.isFetching}
            error={staffListQuery.error ? 'Đã xảy ra lỗi khi tải danh sách nhân viên.' : null}
            onRetry={() => staffListQuery.refetch()}
            onPageChange={(p) => updateStaffFilter('page', String(p))}
            onPageSizeChange={(ps) => updateStaffFilter('pageSize', String(ps))}
            hasFilters={Boolean(search || status || spaServiceId)}
            onResetFilters={handleResetStaffFilters}
            onSelectStaff={(stf) => setSelectedStaffId(stf.id)}
            onEditStaff={(stf) => setEditingStaff(stf)}
            onUpdateServices={(stf) => setUpdatingServicesStaff(stf)}
            onResignStaff={(stf) => setResigningStaff(stf)}
          />
        </TabsContent>

        {/* Tab Work Schedules (UC-SPA-23) */}
        <TabsContent value="schedule" className="space-y-4 pt-1">
          <WeeklyScheduleToolbar
            fromDate={fromDate}
            toDate={toDate}
            onPrevWeek={() => setWeekBaseDate(addDays(weekBaseDate, -7))}
            onNextWeek={() => setWeekBaseDate(addDays(weekBaseDate, 7))}
            onCurrentWeek={() => setWeekBaseDate(today)}
            staffMemberId={scheduleStaff}
            onStaffMemberIdChange={(id) => updateScheduleFilter('scheduleStaff', id)}
            status={scheduleStatus}
            onStatusChange={(st) => updateScheduleFilter('scheduleStatus', st)}
            onOpenCreateShift={() => {
              setCreateShiftDefaultDate(undefined);
              setCreateShiftOpen(true);
            }}
            onOpenCreateBatch={() => setCreateBatchOpen(true)}
          />

          <WeeklyScheduleGrid
            days={days}
            shifts={schedulesQuery.data ?? []}
            isLoading={schedulesQuery.isLoading}
            onAddShiftOnDay={(date) => {
              setCreateShiftDefaultDate(date);
              setCreateShiftOpen(true);
            }}
            onEditShift={(shift) => setEditingShift(shift)}
            onCancelShift={(shift) => setCancellingShift(shift)}
          />
        </TabsContent>
      </Tabs>

      {/* Staff Dialogs & Sheets */}
      <StaffDetailSheet
        staffId={selectedStaffId}
        onClose={() => setSelectedStaffId(null)}
        onEdit={(stf) => {
          setSelectedStaffId(null);
          setEditingStaff(stf);
        }}
        onUpdateServices={(stf) => {
          setSelectedStaffId(null);
          setUpdatingServicesStaff(stf);
        }}
        onResign={(stf) => {
          setSelectedStaffId(null);
          setResigningStaff(stf);
        }}
      />

      <CreateStaffDialog
        open={createStaffOpen}
        onOpenChange={setCreateStaffOpen}
        onSuccess={(created) => setSelectedStaffId(created.id)}
      />

      <EditStaffDialog
        staff={editingStaff}
        open={Boolean(editingStaff)}
        onOpenChange={(open) => !open && setEditingStaff(null)}
      />

      <UpdateStaffServicesDialog
        staff={updatingServicesStaff}
        open={Boolean(updatingServicesStaff)}
        onOpenChange={(open) => !open && setUpdatingServicesStaff(null)}
      />

      <ResignStaffDialog
        staff={resigningStaff}
        open={Boolean(resigningStaff)}
        onOpenChange={(open) => !open && setResigningStaff(null)}
      />

      {/* Work Schedule Dialogs */}
      <CreateShiftDialog
        open={createShiftOpen}
        onOpenChange={setCreateShiftOpen}
        defaultDate={createShiftDefaultDate}
      />

      <CreateBatchShiftsDialog
        open={createBatchOpen}
        onOpenChange={setCreateBatchOpen}
        onBatchComplete={(result) => setBatchResult(result)}
      />

      <BatchResultDialog
        result={batchResult}
        open={Boolean(batchResult)}
        onOpenChange={(open) => !open && setBatchResult(null)}
      />

      <EditShiftDialog
        shift={editingShift}
        open={Boolean(editingShift)}
        onOpenChange={(open) => !open && setEditingShift(null)}
      />

      <CancelShiftDialog
        shift={cancellingShift}
        open={Boolean(cancellingShift)}
        onOpenChange={(open) => !open && setCancellingShift(null)}
      />
    </section>
  );
}
