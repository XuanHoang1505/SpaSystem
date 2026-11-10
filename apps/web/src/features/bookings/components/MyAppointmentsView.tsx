import { CalendarDaysIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { MyAppointmentListItem, MyAppointmentScope } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { SimplePager } from '@/components/shared/SimplePager/SimplePager';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrdersBreadcrumb, OrdersErrorState } from '@/features/orders';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import { useMyAppointments } from '../hooks/useMyAppointments';
import { AppointmentCard } from './AppointmentCard';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
import { RescheduleDialog } from './RescheduleDialog';

const PAGE_SIZE = 10;
const scopes: readonly { value: MyAppointmentScope; label: string }[] = [
  { value: 'upcoming', label: 'Sắp tới' },
  { value: 'past', label: 'Đã qua' },
  { value: 'cancelled', label: 'Đã hủy' },
];
const emptyTitle: Record<MyAppointmentScope, string> = {
  upcoming: 'Bạn chưa có lịch hẹn nào sắp tới',
  past: 'Chưa có lịch hẹn đã qua',
  cancelled: 'Bạn chưa hủy lịch hẹn nào',
};

const parseScope = (value: string | null): MyAppointmentScope =>
  scopes.find((scope) => scope.value === value)?.value ?? 'upcoming';
const parsePage = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/** SCR-W14 — Lịch hẹn của tôi (UC-SPA-16): three tabs, cards, reschedule and cancel. */
export function MyAppointmentsView() {
  useDocumentTitle('Lịch hẹn của tôi');
  const [search, setSearch] = useSearchParams();
  const scope = parseScope(search.get('scope'));
  const pageNumber = parsePage(search.get('page'));
  const query = useMyAppointments({ scope, pageNumber, pageSize: PAGE_SIZE });
  const [rescheduling, setRescheduling] = useState<MyAppointmentListItem | null>(null);
  const [cancelling, setCancelling] = useState<MyAppointmentListItem | null>(null);
  const data = query.data;

  const update = (next: { scope: MyAppointmentScope; page?: number }) => {
    const params = new URLSearchParams();
    if (next.scope !== 'upcoming') params.set('scope', next.scope);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    setSearch(params);
  };

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6 lg:p-8 space-y-6 shadow-xs">
      <OrdersBreadcrumb
        trail={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản', to: '/account' },
          { label: 'Lịch hẹn của tôi' },
        ]}
      />
        <PageHeader
          title="Lịch hẹn của tôi"
          description="Xem, đổi giờ hoặc hủy các lịch hẹn của bạn."
          className="border-b pb-5"
          actions={
            <Button asChild>
              <Link to="/services">Đặt lịch hẹn mới</Link>
            </Button>
          }
        />
        <div role="group" aria-label="Nhóm lịch hẹn" className="flex gap-6 border-b">
        {scopes.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={scope === value}
            onClick={() => update({ scope: value })}
            className={cn(
              '-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
              scope === value
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div data-testid="appointments-skeleton" className="space-y-4">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <OrdersErrorState
          error={query.error}
          title="Không tải được lịch hẹn"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={CalendarDaysIcon}
          title={emptyTitle[scope]}
          action={
            scope === 'upcoming' ? (
              <Button asChild>
                <Link to="/services">Đặt lịch hẹn</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        data && (
          <div aria-busy={query.isPlaceholderData} className="space-y-3">
            {data.items.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onReschedule={setRescheduling}
                onCancel={setCancelling}
              />
            ))}
            <SimplePager
              pageNumber={data.pageNumber}
              totalPages={data.totalPages}
              onPageChange={(page) => update({ scope, page })}
            />
          </div>
        )
      )}

      <RescheduleDialog appointment={rescheduling} onClose={() => setRescheduling(null)} />
      <CancelAppointmentDialog appointment={cancelling} onClose={() => setCancelling(null)} />
    </section>
  );
}
