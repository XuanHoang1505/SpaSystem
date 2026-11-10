import { CheckCircle2Icon, ClockIcon, XCircleIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersQueryKeys } from '@spa/api-client';
import type { OrderAppointment, OrderDetail } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { formatCurrency, formatDateTimeUtc, formatLocalTime } from '@/lib/formatting/formatters';
import { formatLongDate } from '@/lib/formatting/vietnamTime';
import { orderErrorCode } from '../errors';
import { useOrder } from '../hooks/useOrder';
import { CheckoutSteps } from './CheckoutSteps';
import { OrdersErrorState } from './OrdersErrorState';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The return URL only shows the result; the status arrives by IPN, so wait for it (BR-ORD-05, Q-19). */
const POLL_MS = 2000;
const MAX_POLLS = 10;

const latestPayment = (order: OrderDetail) =>
  [...order.payments].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))[0];

const isWaiting = (order: OrderDetail | undefined) =>
  order?.status === 'pending_payment' && latestPayment(order)?.status === 'pending';

type Tone = 'success' | 'danger' | 'neutral';
const toneClass: Record<Tone, string> = {
  success: 'bg-status-success text-status-success-foreground',
  danger: 'bg-status-danger text-status-danger-foreground',
  neutral: 'bg-status-neutral text-status-neutral-foreground',
};

/** SCR-W12 — Kết quả thanh toán (UC-SPA-11). */
export function PaymentResultView({
  search,
  pollIntervalMs = POLL_MS,
}: {
  search: URLSearchParams;
  pollIntervalMs?: number;
}) {
  useDocumentTitle('Kết quả thanh toán');
  const raw = search.get('orderId');
  const orderId = raw && GUID.test(raw) && search.get('error') === null ? raw : null;
  const query = useOrder(orderId, {
    refetchInterval: (order, reads) =>
      isWaiting(order) && reads <= MAX_POLLS ? pollIntervalMs : false,
  });
  const order = query.data;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const status = order?.status;
  const queryClient = useQueryClient();
  useEffect(() => {
    if (status) headingRef.current?.focus();
  }, [status]);
  // A paid order empties the bought lines from the cart (BR-ORD-06): reload it once per order.
  useEffect(() => {
    if (status === 'paid') void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.cart });
  }, [status, orderId, queryClient]);

  let body: ReactNode;
  if (!orderId)
    body = (
      <EmptyState
        title="Không xác nhận được kết quả thanh toán"
        description="Nếu bạn đã bị trừ tiền, hãy liên hệ spa để được kiểm tra."
        action={homeButton}
      />
    );
  else if (query.isPending)
    body = (
      <Skeleton data-testid="result-skeleton" className="mx-auto h-64 w-full max-w-xl rounded-xl" />
    );
  else if (query.isError)
    body =
      orderErrorCode(query.error) === 'order_not_found' ? (
        <EmptyState title="Không tìm thấy đơn hàng" action={homeButton} />
      ) : (
        <OrdersErrorState
          error={query.error}
          title="Không tải được kết quả"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      );
  else if (order) {
    const exhausted = isWaiting(order) && query.readCount > MAX_POLLS;
    body = (
      <ResultCard
        order={order}
        exhausted={exhausted}
        onCheck={() => void query.refetch()}
        headingRef={headingRef}
        checking={query.isFetching}
      />
    );
  }

  return (
    <div className="space-y-2">
      <CheckoutSteps current={3} />
      <PageHeader title="Kết quả thanh toán" />
      {body}
    </div>
  );
}

const homeButton = (
  <Button asChild>
    <Link to="/">Về trang chủ</Link>
  </Button>
);

function ResultCard({
  order,
  exhausted,
  onCheck,
  checking,
  headingRef,
}: {
  order: OrderDetail;
  exhausted: boolean;
  onCheck: () => void;
  checking: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const latest = latestPayment(order);
  let icon: LucideIcon = ClockIcon;
  let tone: Tone = 'neutral';
  let title: string;
  let note: ReactNode = null;
  let actions: ReactNode;

  if (order.status === 'paid') {
    icon = CheckCircle2Icon;
    tone = 'success';
    title = 'Thanh toán thành công';
    const paidAt = order.payments.find((payment) => payment.status === 'succeeded')?.paidAtUtc;
    note = paidAt ? `Thanh toán lúc ${formatDateTimeUtc(paidAt)}.` : null;
    actions = (
      <>
        {order.items.some((item) => item.type === 'package') && (
          <Button asChild>
            <Link to="/my-packages">Xem gói của tôi</Link>
          </Button>
        )}
        {order.appointment ? (
          <Button asChild>
            <Link to={`/booking/success?appointmentId=${order.appointment.id}`}>Xem lịch hẹn</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/my-packages">Đặt lịch</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/services">Tiếp tục mua sắm</Link>
        </Button>
      </>
    );
  } else if (order.status === 'expired') {
    title = 'Đơn hàng đã hết hạn';
    note = 'Nếu bạn đã thanh toán, hệ thống sẽ cập nhật khi nhận được kết quả.';
    actions = (
      <Button asChild>
        <Link to="/cart">Mua lại</Link>
      </Button>
    );
  } else if (order.status === 'cancelled') {
    title = 'Đơn hàng đã bị hủy';
    actions = homeButton;
  } else if (latest?.status === 'failed') {
    icon = XCircleIcon;
    tone = 'danger';
    title = 'Thanh toán chưa thành công';
    note = `Đơn của bạn vẫn được giữ đến ${formatDateTimeUtc(order.paymentDueAtUtc)}.`;
    actions = (
      <>
        {order.isPayable && (
          <Button asChild>
            <Link to={`/checkout?orderId=${order.id}`}>Thử lại thanh toán</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/cart">Về giỏ hàng</Link>
        </Button>
      </>
    );
  } else if (exhausted) {
    title = 'Chưa nhận được kết quả từ cổng thanh toán';
    note = 'Kết quả có thể đến chậm. Bạn có thể kiểm tra lại sau ít phút.';
    actions = (
      <>
        <Button onClick={onCheck} loading={checking}>
          Kiểm tra lại
        </Button>
        {homeButton}
      </>
    );
  } else if (latest?.status === 'pending') {
    title = 'Đang xác nhận thanh toán…';
    note = 'Vui lòng chờ trong giây lát, không đóng trang này.';
    actions = null;
  } else {
    title = 'Đơn hàng chưa được thanh toán';
    actions = order.isPayable ? (
      <Button asChild>
        <Link to={`/checkout?orderId=${order.id}`}>Thanh toán</Link>
      </Button>
    ) : (
      homeButton
    );
  }

  const Icon = icon;
  return (
    <section className="mx-auto max-w-xl space-y-6 rounded-2xl border bg-card p-6 text-center">
      <span className={cn('mx-auto grid size-14 place-items-center rounded-full', toneClass[tone])}>
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <div aria-live="polite" className="space-y-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl outline-none">
          {title}
        </h2>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      <dl className="grid gap-2 rounded-xl bg-muted/50 p-3 text-left text-sm sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Mã đơn</dt>
          <dd className="font-medium">{order.code}</dd>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Phương thức</dt>
          <dd className="font-medium">{latest ? 'VNPay' : 'Chưa chọn'}</dd>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <dt className="text-xs text-muted-foreground">Số tiền</dt>
          <dd className="font-heading font-semibold text-primary">
            {formatCurrency(order.grandTotal)}
          </dd>
        </div>
      </dl>
      <ul className="divide-y rounded-xl border text-left text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 p-3">
            <span>{item.productName}</span>
            <span>{formatCurrency(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      {order.appointment && <AppointmentBlock appointment={order.appointment} />}
      {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
    </section>
  );
}

/** The appointment a book-now order holds: when, with whom, and whether the hold is still there. */
function AppointmentBlock({ appointment }: { appointment: OrderAppointment }) {
  const badge = appointmentStatusBadge(appointment.status);
  return (
    <section aria-label="Lịch hẹn" className="space-y-2 rounded-xl border p-3 text-left text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-base font-semibold">Lịch hẹn</h3>
        <StatusBadge label={badge.label} tone={badge.tone} status={appointment.status} />
      </div>
      <p>{formatLongDate(appointment.date)}</p>
      <p>{`${formatLocalTime(appointment.startTime)} – ${formatLocalTime(appointment.endTime)}`}</p>
      <p>{`Kỹ thuật viên ${appointment.staff.fullName}`}</p>
      {appointment.status === 'hold_expired' && (
        <p className="text-muted-foreground">Chỗ giữ đã hết hạn, hãy đặt lại</p>
      )}
    </section>
  );
}
