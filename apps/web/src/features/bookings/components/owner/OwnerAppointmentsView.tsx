import { useEffect, useState } from 'react';
import type { AppointmentListItem } from '@spa/shared-types';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrdersBreadcrumb } from '@/features/orders';
import { vietnamNow } from '@/lib/formatting/vietnamTime';
import type { OwnerAppointmentAction } from '../../appointmentStatus';
import { errorMessageOf } from '../../errors';
import { useOwnerAppointments } from '../../hooks/owner/useOwnerAppointments';
import { useWorkingStaff } from '../../hooks/owner/useWorkingStaff';
import { DayCalendar } from './DayCalendar';
import type { DropCommand } from './dayGrid';
import { DropConfirmDialog } from './DropConfirmDialog';
import { OwnerAppointmentActions } from './OwnerAppointmentActions';
import { OwnerAppointmentFilters } from './OwnerAppointmentFilters';
import { OwnerAppointmentSheet } from './OwnerAppointmentSheet';
import { OwnerAppointmentsTable } from './OwnerAppointmentsTable';
import {
  useOwnerAppointmentFilters,
  type OwnerAppointmentsViewMode,
} from './useOwnerAppointmentFilters';

export function OwnerAppointmentsView() {
  const filters = useOwnerAppointmentFilters();
  const queryParams = filters.view === 'day' ? filters.dayParams : filters.listParams;
  const query = useOwnerAppointments(queryParams);
  const workingStaffQuery = useWorkingStaff();
  const [actionTarget, setActionTarget] = useState<{
    action: OwnerAppointmentAction;
    appointment: AppointmentListItem;
  } | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{
    appointment: AppointmentListItem;
    command: DropCommand;
    targetStaffName?: string;
  } | null>(null);

  const handleDropCommand = (appointment: AppointmentListItem, command: DropCommand) => {
    let targetStaffName: string | undefined;
    if (command.kind === 'assign_staff') {
      const staff = workingStaffQuery.data?.items?.find((s) => s.id === command.staffMemberId);
      targetStaffName = staff?.fullName;
    }
    setPendingDrop({
      appointment,
      command,
      targetStaffName,
    });
  };

  // If response has totalPages > 0 and pageNumber > totalPages, navigate to last page
  useEffect(() => {
    if (
      filters.view === 'list' &&
      query.data &&
      query.data.totalPages > 0 &&
      filters.pageNumber > query.data.totalPages
    ) {
      filters.setPage(query.data.totalPages, { replace: true });
    }
  }, [filters.view, query.data, filters]);

  const errorMessage = query.isError
    ? (errorMessageOf(query.error) ?? 'Không kết nối được máy chủ')
    : null;

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
      <OrdersBreadcrumb
        trail={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản', to: '/account' },
          { label: 'Lịch hẹn' },
        ]}
      />

      <Tabs
        value={filters.view}
        onValueChange={(val) => filters.setView(val as OwnerAppointmentsViewMode)}
        className="space-y-4"
      >
        <PageHeader
          title="Lịch hẹn"
          description="Theo dõi, xác nhận và điều chỉnh lịch hẹn của khách."
          className="border-b pb-4 sm:items-center"
          actions={
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="list">Danh sách</TabsTrigger>
              <TabsTrigger value="day">Lịch ngày</TabsTrigger>
            </TabsList>
          }
        />

        <OwnerAppointmentFilters filters={filters} />

        <TabsContent value="list" className="space-y-4 pt-1">
          <OwnerAppointmentsTable
            data={query.data?.items}
            page={
              query.data
                ? {
                    pageNumber: query.data.pageNumber,
                    pageSize: query.data.pageSize,
                    totalCount: query.data.totalCount,
                    totalPages: query.data.totalPages,
                  }
                : undefined
            }
            isLoading={query.isLoading}
            isFetching={query.isFetching}
            error={errorMessage}
            onRetry={() => void query.refetch()}
            onPageChange={filters.setPage}
            onPageSizeChange={filters.setPageSize}
            hasFilters={filters.hasFilters}
            onResetFilters={filters.reset}
            onOpen={filters.openAppointment}
            onAction={(action, appointment) => setActionTarget({ action, appointment })}
          />
        </TabsContent>

        <TabsContent value="day" className="space-y-4 pt-1">
          <DayCalendar
            date={filters.date}
            today={vietnamNow()}
            query={query}
            staff={workingStaffQuery.data?.items ?? []}
            staffFilter={filters.staffMemberId}
            onOpen={filters.openAppointment}
            onDropCommand={handleDropCommand}
            busyAppointmentId={pendingDrop?.appointment.id}
          />
        </TabsContent>
      </Tabs>

      <OwnerAppointmentSheet
        appointmentId={filters.appointmentId}
        onClose={filters.closeAppointment}
        onAction={(action, appointment) => setActionTarget({ action, appointment })}
      />

      <OwnerAppointmentActions current={actionTarget} onClose={() => setActionTarget(null)} />

      <DropConfirmDialog pending={pendingDrop} onClose={() => setPendingDrop(null)} />
    </section>
  );
}
