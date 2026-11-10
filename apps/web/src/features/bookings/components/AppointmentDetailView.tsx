import {
  CalendarDaysIcon,
  CalendarOffIcon,
  ClockIcon,
  FileTextIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  ClockExclamationPoint,
  UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrdersBreadcrumb, OrdersErrorState } from '@/features/orders';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { useCountdown } from '@/hooks/useCountdown';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDateTimeUtc, formatLocalTime } from '@/lib/formatting/formatters';
import { formatLongDate } from '@/lib/formatting/vietnamTime';
import { appointmentStatusBadge } from '../appointmentStatus';
import { bookingErrorKind } from '../errors';
import { useMyAppointment } from '../hooks/useMyAppointment';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
import { RescheduleDialog } from './RescheduleDialog';

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const notFound = (
  <EmptyState
    icon={CalendarOffIcon}
    title="Không tìm thấy lịch hẹn"
    description="Lịch hẹn này không tồn tại hoặc không thuộc tài khoản của bạn."
    action={
      <Button asChild>
        <Link to="/my-bookings">Về Lịch hẹn của tôi</Link>
      </Button>
    }
  />
);

/** SCR-W15 — Chi tiết lịch hẹn (UC-SPA-16): the appointment, its source, the change deadline, pay/reschedule/cancel. */
export function AppointmentDetailView({ appointmentId }: { appointmentId: string }) {
  useDocumentTitle('Chi tiết lịch hẹn');
  const query = useMyAppointment(appointmentId);
  const appointment = query.data;
  const secondsLeft = useCountdown(appointment?.holdExpiresAtUtc ?? null);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (query.isPending)
    return <Skeleton data-testid="appointment-skeleton" className="h-72 rounded-2xl" />;
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

  const badge = appointmentStatusBadge(appointment.status);
  const changeable = appointment.canReschedule || appointment.canCancel;
  const stillValid =
    appointment.status === 'pending_confirmation' || appointment.status === 'confirmed';
  const session = appointment.treatmentSession;

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6 lg:p-8 space-y-6 shadow-xs">
      <OrdersBreadcrumb
        trail={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản', to: '/account' },
          { label: 'Lịch hẹn của tôi', to: '/my-bookings' },
          { label: 'Chi tiết lịch hẹn' },
        ]}
      />
      <PageHeader
        title="Chi tiết lịch hẹn"
        className="border-b pb-5"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8 items-start">
        {/* Left Column: Spa Appointment Pass */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-xs">
            {/* Header: Service Name + Status */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Dịch vụ đã chọn
                </span>
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  {appointment.service.name}
                </h2>
              </div>
              <StatusBadge label={badge.label} tone={badge.tone} status={appointment.status} />
            </div>

            {/* Date & Time Highlights Box */}
            <div className="my-5 grid gap-3 rounded-xl bg-muted/40 p-4 border sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-card border text-primary">
                  <CalendarDaysIcon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Ngày hẹn</dt>
                  <dd className="font-medium text-foreground">{formatLongDate(appointment.date)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-card border text-primary">
                  <ClockIcon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Giờ hẹn</dt>
                  <dd className="font-medium text-foreground">
                    {`${formatLocalTime(appointment.startTime)} – ${formatLocalTime(appointment.endTime)}`}
                  </dd>
                </div>
              </div>
            </div>

            {/* Details: Staff and Source */}
            <dl className="grid gap-4 text-sm sm:grid-cols-2 border-b pb-5">
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  <UserIcon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Kỹ thuật viên</dt>
                  <dd className="font-medium text-foreground">{appointment.staff.fullName}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  <FileTextIcon className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Nguồn đặt lịch</dt>
                  <dd className="font-medium text-foreground">
                    {session ? (
                      <Link
                        to={`/my-packages/${session.customerPackageId}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {`Buổi ${session.sequenceNumber} · ${session.packageName}`}
                      </Link>
                    ) : appointment.source === 'entitlement' ? (
                      'Dịch vụ đã mua'
                    ) : (
                      `Đặt ngay${appointment.order ? ` · Đơn ${appointment.order.code}` : ''}`
                    )}
                  </dd>
                </div>
              </div>
            </dl>

            {/* Customer Note */}
            {appointment.note && (
              <div className="my-4 space-y-1.5 rounded-xl bg-muted/40 p-4 text-sm border">
                <p className="font-medium text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  Ghi chú của bạn
                </p>
                <p className="whitespace-pre-line text-foreground/90">{appointment.note}</p>
              </div>
            )}

            {/* Alerts & Deadlines */}
            <div className="space-y-3 pt-2">
              {appointment.status === 'held' && (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      {secondsLeft > 0
                        ? `Chỗ được giữ thêm ${clock(secondsLeft)} để bạn thanh toán.`
                        : 'Thời gian giữ chỗ đã hết, đang cập nhật.'}
                    </span>
                    {appointment.order?.status === 'pending_payment' && secondsLeft > 0 && (
                      <Button asChild size="sm">
                        <Link to={`/checkout?orderId=${appointment.order.id}`}>
                          Thanh toán ngay (VNPay)
                        </Link>
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {appointment.status === 'hold_expired' && (
                <Alert>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                    <span>Chỗ giữ đã hết hạn</span>
                    <Button asChild size="sm">
                      <Link to="/services">Đặt lại</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {appointment.status === 'cancelled' && (
                <div className="space-y-1 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive-foreground border border-destructive/20">
                  {appointment.cancelledAtUtc && (
                    <p className="font-medium">{`Đã hủy lúc ${formatDateTimeUtc(appointment.cancelledAtUtc)}`}</p>
                  )}
                  {appointment.cancellationReason && (
                    <p className="text-muted-foreground">{`Lý do: ${appointment.cancellationReason}`}</p>
                  )}
                </div>
              )}
              {changeable && appointment.changeDeadlineAtUtc && (
                <p className="text-xs text-muted-foreground">
                  {`Có thể đổi hoặc hủy đến ${formatDateTimeUtc(appointment.changeDeadlineAtUtc)}`}
                </p>
              )}
              {!changeable && stillValid && (
                <p className="text-xs text-muted-foreground">
                  {`Đã quá hạn đổi hoặc hủy (${catalogPolicies.customerChangeCutoffHours} giờ trước giờ hẹn). Vui lòng liên hệ spa.`}
                </p>
              )}

              {/* Actions */}
              {changeable && (
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {appointment.canReschedule && (
                    <Button variant="outline" onClick={() => setRescheduling(true)}>
                      Đổi giờ hẹn
                    </Button>
                  )}
                  {appointment.canCancel && (
                    <Button variant="outline" onClick={() => setCancelling(true)}>
                      Hủy lịch
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Spa Experience, Location & Preparation */}
        <div className="space-y-5">
          {/* Location & Contact Card */}
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 border-b pb-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <MapPinIcon className="size-4" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground">Địa chỉ cơ sở Spa</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">Như Nguyệt Spa & Chăm Sóc Da</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Số 123 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-muted-foreground">
                  <ClockIcon className="size-3" aria-hidden="true" />
                  09:00 – 20:30 hàng ngày
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-muted-foreground">
                  <PhoneIcon className="size-3" aria-hidden="true" />
                  Hotline: 1900 6886
                </span>
              </div>
            </div>
          </div>

          {/* Preparation & Welcome Card */}
          <div className="rounded-2xl border bg-card p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2.5 border-b pb-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ClockExclamationPoint className="size-4" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground">Lưu ý trước buổi hẹn</h3>
            </div>
            <ul className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>Vui lòng đến trước <strong>10 – 15 phút</strong> để lễ tân tiếp đón, soi da miễn phí và thưởng thức trà thảo mộc thư giãn.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>Tránh sử dụng các hoạt chất treatment mạnh (AHA, BHA, Retinol) trong vòng 24 giờ trước buổi chăm sóc da chuyên sâu.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>Nếu có thay đổi đột xuất, vui lòng báo trước qua hotline hoặc đổi lịch trên hệ thống trước ít nhất <strong>24 giờ</strong>.</span>
              </li>
            </ul>
          </div>

          {/* Quick Help Card */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-primary">Cần hỗ trợ khẩn cấp?</p>
              <p className="text-xs text-muted-foreground">Lễ tân luôn sẵn sàng hỗ trợ bạn đổi giờ hoặc chỉ đường.</p>
            </div>
            <Button asChild size="sm" variant="default" className="shrink-0 font-medium">
              <a href="tel:19006886">Gọi 1900 6886</a>
            </Button>
          </div>
        </div>
      </div>

      <RescheduleDialog
        appointment={rescheduling ? appointment : null}
        onClose={() => setRescheduling(false)}
      />
      <CancelAppointmentDialog
        appointment={cancelling ? appointment : null}
        onClose={() => setCancelling(false)}
      />
    </section>
  );
}
