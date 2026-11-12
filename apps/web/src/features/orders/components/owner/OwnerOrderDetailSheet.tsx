import type { ReactNode } from 'react';
import {
  CalendarClockIcon,
  ClockIcon,
  CreditCardIcon,
  MailIcon,
  PackageIcon,
  PhoneIcon,
  ReceiptTextIcon,
  TriangleAlertIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { orderErrorCodes } from '@spa/api-client';
import type { OwnerOrderDetail } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import {
  formatCurrency,
  formatDateTimeUtc,
  formatLocalDate,
  formatLocalTime,
} from '@/lib/formatting/formatters';
import { orderErrorCode } from '../../errors';
import { useManagedOrder } from '../../hooks/useManagedOrder';
import { cn } from '@/lib/utils';
import { orderItemTypeBadge, orderStatusBadge } from '../../orderStatus';
import { OrdersErrorState } from '../OrdersErrorState';
import { OwnerPaymentList } from './OwnerPaymentList';

interface OwnerOrderDetailSheetProps {
  order: { id: string; code: string } | null;
  onClose: () => void;
  onCancel: (order: OwnerOrderDetail) => void;
}

/** Detail of one order for the owner (UC-SPA-13); "Hủy đơn" follows the API's `canCancel`. */
export function OwnerOrderDetailSheet({ order, onClose, onCancel }: OwnerOrderDetailSheetProps) {
  return (
    <Sheet open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {order && <DetailBody key={order.id} order={order} onCancel={onCancel} />}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  order,
  onCancel,
}: {
  order: { id: string; code: string };
  onCancel: (order: OwnerOrderDetail) => void;
}) {
  const query = useManagedOrder(order.id);
  const detail = query.data;

  let body: ReactNode;
  if (query.isPending) body = <Skeleton className="mx-4 h-64" />;
  else if (query.isError)
    body =
      orderErrorCode(query.error) === orderErrorCodes.orderNotFound ? (
        <EmptyState title="Không tìm thấy đơn hàng" />
      ) : (
        <OrdersErrorState
          error={query.error}
          title="Không tải được đơn hàng"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      );
  else body = <DetailContent detail={detail} />;

  return (
    <>
      <SheetHeader className="flex-row items-start gap-3 border-b">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ReceiptTextIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>Đơn {order.code}</SheetTitle>
            {detail && <StatusBadge {...orderStatusBadge(detail.status)} status={detail.status} />}
          </div>
          <SheetDescription>
            {detail ? `Tạo lúc ${formatDateTimeUtc(detail.createdAtUtc)}` : 'Chi tiết đơn hàng.'}
          </SheetDescription>
        </div>
      </SheetHeader>
      {body}
      {detail?.canCancel && (
        <SheetFooter>
          <Button variant="destructive" onClick={() => onCancel(detail)}>
            Hủy đơn
          </Button>
        </SheetFooter>
      )}
    </>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {title}
      </h3>
      {/* Content lines up with the heading text, under its icon (size-4 + gap-2). */}
      <div className="pl-6">{children}</div>
    </section>
  );
}

/** Order lines in one row each (name, type, price): the checkout card is too large for a Sheet. */
function OrderItemList({ detail }: { detail: OwnerOrderDetail }) {
  return (
    <div className="rounded-xl border text-sm">
      <ul className="divide-y">
        {detail.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">{item.productName}</p>
              <Badge className={cn('text-xs font-normal', orderItemTypeBadge(item.type).className)}>
                {orderItemTypeBadge(item.type).label}
              </Badge>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium text-foreground">{formatCurrency(item.lineTotal)}</p>
              {item.discountAmount > 0 && (
                <p className="text-xs text-muted-foreground line-through">
                  {formatCurrency(item.unitPrice)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <dl className="space-y-1 border-t bg-muted/40 px-3 py-2.5">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tạm tính</dt>
          <dd>{formatCurrency(detail.subtotal)}</dd>
        </div>
        {detail.discountTotal > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Giảm giá{detail.promotion ? ` (${detail.promotion.code})` : ''}
            </dt>
            <dd>−{formatCurrency(detail.discountTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between font-semibold text-foreground">
          <dt>Tổng thanh toán</dt>
          <dd className="text-primary">{formatCurrency(detail.grandTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}

function DetailContent({ detail }: { detail: OwnerOrderDetail | undefined }) {
  if (!detail) return null;
  const lateSuccess =
    (detail.status === 'cancelled' || detail.status === 'expired') &&
    detail.payments.some((payment) => payment.status === 'succeeded');

  return (
    <div className="space-y-4 px-4 pb-6">
      {lateSuccess && (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertDescription>
            {detail.status === 'cancelled' ? 'Đơn đã hủy' : 'Đơn đã hết hạn'} nhưng có lần thanh
            toán thành công. Cần hoàn tiền thủ công cho khách.
          </AlertDescription>
        </Alert>
      )}

      {detail.cancelledAtUtc && (
        <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
          <p>Hủy lúc {formatDateTimeUtc(detail.cancelledAtUtc)}</p>
          {detail.cancellationReason && <p>Lý do: {detail.cancellationReason}</p>}
        </div>
      )}

      <Tabs defaultValue="order">
        <TabsList className="w-full">
          <TabsTrigger value="order" className="gap-1.5">
            <ReceiptTextIcon aria-hidden="true" />
            Thông tin đơn
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCardIcon aria-hidden="true" />
            Các lần thanh toán ({detail.payments.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="order" className="space-y-5 pt-3">
          <OrderTab detail={detail} />
        </TabsContent>
        <TabsContent value="payments" className="pt-3">
          <OwnerPaymentList payments={detail.payments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderTab({ detail }: { detail: OwnerOrderDetail }) {
  return (
    <>
      <Section title="Khách hàng" icon={UserIcon}>
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-foreground">{detail.customer.fullName}</p>
          <p className="flex items-center gap-2">
            <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={`tel:${detail.customer.phoneNumber}`}
            >
              {detail.customer.phoneNumber}
            </a>
          </p>
          <p className="flex items-center gap-2">
            <MailIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a
              className="break-all text-primary underline-offset-4 hover:underline"
              href={`mailto:${detail.customer.email}`}
            >
              {detail.customer.email}
            </a>
          </p>
        </div>
      </Section>

      {(detail.status === 'pending_payment' || detail.promotion) && (
        <Section title="Thanh toán" icon={ClockIcon}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {detail.status === 'pending_payment' && (
              <>
                <dt className="text-muted-foreground">Hạn thanh toán</dt>
                <dd>{formatDateTimeUtc(detail.paymentDueAtUtc)}</dd>
              </>
            )}
            {detail.promotion && (
              <>
                <dt className="text-muted-foreground">Mã khuyến mãi</dt>
                <dd>
                  <span className="font-mono">{detail.promotion.code}</span> (giảm{' '}
                  {formatCurrency(detail.promotion.discountAmount)})
                </dd>
              </>
            )}
          </dl>
        </Section>
      )}

      <Section title={`Sản phẩm (${detail.items.length})`} icon={PackageIcon}>
        <OrderItemList detail={detail} />
      </Section>

      {detail.appointment && (
        <Section title="Lịch giữ chỗ" icon={CalendarClockIcon}>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">
                {formatLocalDate(detail.appointment.date)},{' '}
                {formatLocalTime(detail.appointment.startTime)}–
                {formatLocalTime(detail.appointment.endTime)}
              </p>
              <p className="text-muted-foreground">
                Nhân viên: <span>{detail.appointment.staff.fullName}</span>
              </p>
            </div>
            <StatusBadge
              {...appointmentStatusBadge(detail.appointment.status)}
              status={detail.appointment.status}
            />
          </div>
        </Section>
      )}
    </>
  );
}
