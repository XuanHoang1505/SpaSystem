import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrdersBreadcrumb } from '@/features/orders';
import { assignedTabLabels, assignedTabs, isAssignedTab } from '../assignedRange';
import { careErrorMessage } from '../errors';
import { useAssignedAppointments } from '../hooks/useCareQueries';
import { AssignedAppointmentsFilters } from './AssignedAppointmentsFilters';
import { AssignedAppointmentsTable } from './AssignedAppointmentsTable';
import { useAssignedFilters } from './useAssignedFilters';

/** SCR-W26 (UC-SPA-25): the staff member's assigned appointments by tab, date range and status. */
export function StaffAppointmentsView() {
  const filters = useAssignedFilters();
  const query = useAssignedAppointments(filters.params);
  const navigate = useNavigate();

  const emptyDescription =
    filters.tab === 'today' && !filters.isCustom
      ? 'Hôm nay bạn chưa được phân công buổi nào.'
      : 'Không có lịch trong khoảng ngày đã chọn.';

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
      <OrdersBreadcrumb
        trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Lịch hẹn được phân công' }]}
      />

      <Tabs
        value={filters.tab}
        onValueChange={(value) => isAssignedTab(value) && filters.setTab(value)}
        className="space-y-4"
      >
        <PageHeader
          title="Lịch hẹn được phân công"
          description="Các buổi chăm sóc spa giao cho bạn. Chọn một lịch để xem khách, dị ứng và lập hồ sơ da."
          className="border-b pb-4 sm:items-center"
          actions={
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              {assignedTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {assignedTabLabels[tab]}
                </TabsTrigger>
              ))}
            </TabsList>
          }
        />
      </Tabs>

      <AssignedAppointmentsFilters filters={filters} />

      <AssignedAppointmentsTable
        data={filters.params ? query.data : []}
        isLoading={filters.params !== null && query.isLoading}
        isFetching={query.isFetching}
        error={
          query.isError ? (careErrorMessage(query.error) ?? 'Không kết nối được máy chủ') : null
        }
        onRetry={() => void query.refetch()}
        emptyDescription={filters.params ? emptyDescription : 'Sửa khoảng ngày để xem lịch hẹn.'}
        onOpen={(id) => navigate(`/staff/bookings/${encodeURIComponent(id)}`)}
      />
    </section>
  );
}
