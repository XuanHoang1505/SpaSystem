import {
  CheckCircle2Icon,
  ClockIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  TimerIcon,
  XCircleIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyOrderListItem, OrderStatus } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { useCountdown } from '@/hooks/useCountdown';
import { formatCurrency, formatDateTimeUtc } from '@/lib/formatting/formatters';
import { cn } from '@/lib/utils';
import { checkoutPath } from '../checkoutParams';
import { orderStatusBadge } from '../orderStatus';

/** Colour language of a card by status: header tint, icon tile. Full class names so Tailwind finds them. */
const look: Record<OrderStatus, { icon: LucideIcon; header: string; tile: string; note: string }> =
  {
    pending_payment: {
      icon: ClockIcon,
      header: 'bg-status-warning/60',
      tile: 'bg-status-warning text-status-warning-foreground',
      note: 'text-status-warning-foreground',
    },
    paid: {
      icon: CheckCircle2Icon,
      header: 'bg-status-success/50',
      tile: 'bg-status-success text-status-success-foreground',
      note: 'text-status-success-foreground',
    },
    expired: {
      icon: ReceiptTextIcon,
      header: 'bg-muted/60',
      tile: 'bg-status-neutral text-status-neutral-foreground',
      note: 'text-muted-foreground',
    },
    cancelled: {
      icon: XCircleIcon,
      header: 'bg-status-danger/40',
      tile: 'bg-status-danger text-status-danger-foreground',
      note: 'text-muted-foreground',
    },
  };

/** The line at the bottom left of a card: what the status means for the customer. */
const statusNotes: Record<OrderStatus, string> = {
  pending_payment: 'Đơn hàng chưa được thanh toán. Vui lòng thanh toán để kích hoạt dịch vụ.',
  paid: 'Đã thanh toán. Dịch vụ đã được lưu vào tài khoản của bạn.',
  expired: 'Đơn hàng đã hết hạn thanh toán.',
  cancelled: 'Đơn hàng đã bị hủy.',
};

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** "Tự hủy sau mm:ss" pill of an unpaid order; hidden once the time is up (the API still decides `isPayable`). */
function DueCountdown({ dueAtUtc }: { dueAtUtc: string }) {
  const seconds = useCountdown(dueAtUtc);
  if (seconds <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-warning px-3 py-1 text-xs font-semibold text-status-warning-foreground">
      <TimerIcon className="size-3.5" aria-hidden="true" />
      Tự hủy sau {clock(seconds)}
    </span>
  );
}

/** One order of "Đơn hàng của tôi" (Stitch layout): code strip, products and total, then status note and actions. */
export function OrderCard({
  order,
  onView,
  onCancel,
}: {
  order: MyOrderListItem;
  onView: (order: MyOrderListItem) => void;
  onCancel: (order: MyOrderListItem) => void;
}) {
  const badge = orderStatusBadge(order.status);
  const style = look[order.status];
  const Icon = style.icon;
  const more = order.itemCount - order.productNames.length;
  const unpaid = order.status === 'pending_payment';
  return (
    <article
      data-highlight={unpaid}
      className={cn('overflow-hidden rounded-xl border bg-card', unpaid && 'border-primary/50')}
    >
      <header
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 text-sm',
          style.header,
        )}
      >
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
            Mã đơn
          </span>
          <span className="font-semibold tracking-wide text-primary">{order.code}</span>
          <span aria-hidden="true" className="hidden text-muted-foreground/50 sm:inline">
            ·
          </span>
          <span className="text-muted-foreground">{formatDateTimeUtc(order.createdAtUtc)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {unpaid && <DueCountdown dueAtUtc={order.paymentDueAtUtc} />}
          <StatusBadge label={badge.label} tone={badge.tone} status={order.status} />
        </div>
      </header>
      <div className="flex items-center gap-4 px-4 py-3.5">
        <span
          aria-hidden="true"
          className={cn('grid size-10 shrink-0 place-items-center rounded-lg', style.tile)}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <ul className="space-y-0.5">
            {order.productNames.map((name) => (
              <li key={name} className="text-base leading-snug font-medium">
                {name}
              </li>
            ))}
          </ul>
          {more > 0 && <p className="text-sm text-muted-foreground">và {more} sản phẩm khác</p>}
          {unpaid && (
            <p className="mt-0.5 text-sm text-status-warning-foreground">
              Hạn thanh toán: {formatDateTimeUtc(order.paymentDueAtUtc)}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold text-primary">{formatCurrency(order.grandTotal)}</p>
          <p className="text-xs text-muted-foreground">{order.itemCount} sản phẩm</p>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-2.5">
        <p className={cn('text-sm font-medium', style.note)}>{statusNotes[order.status]}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(order)}>
            Xem chi tiết
          </Button>
          {order.canCancel && (
            <Button variant="outline" size="sm" onClick={() => onCancel(order)}>
              Hủy đơn
            </Button>
          )}
          {order.isPayable && (
            <Button asChild size="sm">
              <Link to={checkoutPath({ orderId: order.id })}>
                <ShieldCheckIcon aria-hidden="true" />
                Thanh toán ngay (VNPay)
              </Link>
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
