import { CircleCheckIcon, PhoneIcon } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import type { MyAppointment } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrdersErrorState } from '@/features/orders';
import { usePurchasedPackage } from '@/features/purchases/hooks/usePurchasedPackage';
import { catalogPolicies, siteContact } from '@/features/services/catalogPolicies';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatLocalTime } from '@/lib/formatting/formatters';
import { formatLongDate } from '@/lib/formatting/vietnamTime';
import { appointmentStatusBadge } from '../appointmentStatus';
import { bookingErrorKind } from '../errors';
import { useMyAppointment } from '../hooks/useMyAppointment';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = (
  <EmptyState
    title="Không tìm thấy lịch hẹn"
    description="Lịch hẹn này không tồn tại hoặc không thuộc tài khoản của bạn."
    action={
      <Button asChild>
        <Link to="/my-bookings">Về Lịch hẹn của tôi</Link>
      </Button>
    }
  />
);

/** The page after a booking went through: the appointment ticket and what to do next. */
export function BookingSuccessView({ search }: { search: URLSearchParams }) {
  useDocumentTitle('Đặt lịch thành công');
  const id = search.get('appointmentId');
  return id && GUID.test(id) ? <Success appointmentId={id} /> : notFound;
}

function sourceLabel(appointment: MyAppointment): string {
  if (appointment.treatmentSession)
    return `Buổi ${appointment.treatmentSession.sequenceNumber} của gói ${appointment.treatmentSession.packageName}`;
  return appointment.source === 'entitlement' ? 'Dịch vụ đã mua' : 'Đặt ngay';
}

function Success({ appointmentId }: { appointmentId: string }) {
  const query = useMyAppointment(appointmentId);
  const appointment = query.data;
  const packageId = appointment?.treatmentSession?.customerPackageId;
  const progress = usePurchasedPackage(packageId ?? '', packageId !== undefined);

  if (query.isPending)
    return <Skeleton data-testid="success-skeleton" className="h-80 w-full rounded-2xl" />;
  if (query.isError)
    return bookingErrorKind(query.error) === 'not_found' ? (
      notFound
    ) : (
      <OrdersErrorState
        error={query.error}
        title="Không tải được lịch hẹn"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  if (!appointment) return null;
  if (['held', 'cancelled', 'hold_expired'].includes(appointment.status))
    return <Navigate to={`/my-bookings/${appointment.id}`} replace />;

  const badge = appointmentStatusBadge(appointment.status);
  const bought = appointment.source !== 'book_now';
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-status-success text-status-success-foreground">
          <CircleCheckIcon className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-3xl">Đặt lịch hẹn thành công</h1>
          <p className="text-sm text-muted-foreground">Lịch hẹn của bạn đã được ghi nhận.</p>
        </div>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Phiếu hẹn" className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge label={badge.label} tone={badge.tone} status={appointment.status} />
            <span>{sourceLabel(appointment)}</span>
          </div>
          <h2 className="font-heading text-2xl">{appointment.service.name}</h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-4">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Ngày hẹn
              </dt>
              <dd className="mt-1 text-sm font-semibold">{formatLongDate(appointment.date)}</dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Khung giờ
              </dt>
              <dd className="mt-1 text-sm font-semibold">
                {`${formatLocalTime(appointment.startTime)} – ${formatLocalTime(appointment.endTime)}`}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Kỹ thuật viên
              </dt>
              <dd className="mt-1 text-sm font-semibold">{appointment.staff.fullName}</dd>
            </div>
          </dl>
          {progress.data && (
            <p className="text-sm">
              {`Tiến độ gói: ${progress.data.usedSessions}/${progress.data.totalSessions} buổi`}
            </p>
          )}
        </section>
        <aside className="space-y-4">
          <section
            aria-label="Thao tác lịch hẹn"
            className="space-y-3 rounded-2xl border bg-card p-5"
          >
            <h2 className="text-xl">Thao tác lịch hẹn</h2>
            <Button asChild className="w-full">
              <Link to={`/my-bookings/${appointment.id}`}>Xem lịch hẹn của tôi</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              {bought ? (
                <Link to="/my-packages">Về Gói của tôi</Link>
              ) : (
                <Link to="/services">Về danh sách dịch vụ</Link>
              )}
            </Button>
          </section>
          <section aria-label="Lưu ý" className="space-y-2 rounded-2xl bg-muted/50 p-5 text-sm">
            <h2 className="text-xl">Lưu ý</h2>
            <p>{`Đổi hoặc hủy lịch trước giờ hẹn ${catalogPolicies.customerChangeCutoffHours} giờ.`}</p>
            <p className="flex items-center gap-2">
              <PhoneIcon className="size-4" aria-hidden="true" />
              {`Cần hỗ trợ? Gọi ${siteContact.hotline}`}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
