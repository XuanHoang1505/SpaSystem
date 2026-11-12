import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { paymentStatusBadge } from '@/features/payments/paymentStatus';
import { formatCurrency, formatDateTimeUtc } from '@/lib/formatting/formatters';
import { orderErrorCode } from '../errors';
import { useOrder } from '../hooks/useOrder';
import { orderStatusBadge } from '../orderStatus';
import { OrderLines, OrderTotals } from './OrderSummary';
import { OrdersErrorState } from './OrdersErrorState';

/** Detail of one order from the list: lines, totals, payment attempts and the cancellation reason. */
export function OrderDetailSheet({
  order,
  onClose,
}: {
  order: { id: string; code: string } | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Đơn {order?.code}</SheetTitle>
          <SheetDescription>Chi tiết đơn hàng và các lần thanh toán.</SheetDescription>
        </SheetHeader>
        {order && <OrderDetailBody orderId={order.id} />}
      </SheetContent>
    </Sheet>
  );
}

function OrderDetailBody({ orderId }: { orderId: string }) {
  const query = useOrder(orderId);
  const order = query.data;
  if (query.isPending) return <Skeleton data-testid="detail-skeleton" className="m-4 h-64" />;
  if (query.isError)
    return orderErrorCode(query.error) === 'order_not_found' ? (
      <EmptyState title="Không tìm thấy đơn hàng" />
    ) : (
      <OrdersErrorState
        error={query.error}
        title="Không tải được đơn hàng"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  if (!order) return null;
  const badge = orderStatusBadge(order.status);
  return (
    <div className="space-y-5 px-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <StatusBadge label={badge.label} tone={badge.tone} status={order.status} />
        <span className="text-muted-foreground">
          Đặt lúc {formatDateTimeUtc(order.createdAtUtc)}
        </span>
      </div>
      <OrderLines
        lines={order.items.map((item) => ({
          key: item.id,
          type: item.type,
          name: item.productName,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          lineTotal: item.lineTotal,
        }))}
      />
      <OrderTotals
        subtotal={order.subtotal}
        discountTotal={order.discountTotal}
        grandTotal={order.grandTotal}
        promotion={order.promotion}
      />
      {order.status === 'cancelled' && (
        <p className="rounded-lg bg-muted/50 p-3 text-sm">
          Đã hủy{order.cancelledAtUtc ? ` lúc ${formatDateTimeUtc(order.cancelledAtUtc)}` : ''}
          {order.cancellationReason ? `. Lý do: ${order.cancellationReason}` : ''}
        </p>
      )}
      <section aria-labelledby="payment-attempts" className="space-y-2">
        <h3 id="payment-attempts" className="text-base">
          Các lần thanh toán
        </h3>
        {order.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có lần thanh toán nào.</p>
        ) : (
          <ul className="divide-y rounded-xl border text-sm">
            {order.payments.map((payment) => {
              const status = paymentStatusBadge(payment.status);
              return (
                <li key={payment.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium">VNPay · {formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeUtc(payment.paidAtUtc ?? payment.createdAtUtc)}
                    </p>
                  </div>
                  <StatusBadge label={status.label} tone={status.tone} status={payment.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
