import { ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStartPayment } from '@/features/payments/hooks/useStartPayment';
import { redirectTo } from '@/features/payments/redirect';
import { useCountdown } from '@/hooks/useCountdown';
import { formatDateTimeUtc } from '@/lib/formatting/formatters';
import { orderErrorCode, orderErrorMessage } from '../errors';
import { useOrder } from '../hooks/useOrder';
import { orderStatusBadge } from '../orderStatus';
import { CustomerInfoCard } from './CustomerInfoCard';
import { HoldNotice, OrderLines, OrderTotals, PaymentMethodCard } from './OrderSummary';
import { OrdersErrorState } from './OrdersErrorState';

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Checkout of an order that already exists (`?orderId=`): pay again while it is still payable. */
export function ExistingOrderCheckout({ orderId }: { orderId: string }) {
  const query = useOrder(orderId);
  const startPayment = useStartPayment();
  const [exceeded, setExceeded] = useState(false);
  const order = query.data;
  const secondsLeft = useCountdown(
    order?.status === 'pending_payment' ? order.paymentDueAtUtc : null,
  );

  const pay = () =>
    startPayment.mutate(orderId, {
      onSuccess: (attempt) => redirectTo(attempt.paymentUrl),
      onError: (error) => {
        if (orderErrorCode(error) === 'payment_attempts_exceeded') setExceeded(true);
        else toast.error(orderErrorMessage(error));
      },
    });

  if (query.isPending)
    return (
      <div
        data-testid="checkout-skeleton"
        className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  if (query.isError) {
    if (orderErrorCode(query.error) === 'order_not_found')
      return (
        <EmptyState
          title="Không tìm thấy đơn hàng"
          action={
            <Button asChild>
              <Link to="/cart">Về giỏ hàng</Link>
            </Button>
          }
        />
      );
    return (
      <OrdersErrorState
        error={query.error}
        title="Không tải được đơn hàng"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }
  if (!order) return null;

  const badge = orderStatusBadge(order.status);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-heading text-lg font-semibold">Đơn {order.code}</p>
          <StatusBadge label={badge.label} tone={badge.tone} status={order.status} />
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
        <CustomerInfoCard />
        <PaymentMethodCard />
      </div>
      <Card className="lg:sticky lg:top-24">
        <CardContent className="space-y-4">
          {order.status === 'pending_payment' && (
            <HoldNotice>
              Hạn thanh toán: {formatDateTimeUtc(order.paymentDueAtUtc)}
              {order.isPayable && secondsLeft > 0 && ` (còn ${clock(secondsLeft)})`}
            </HoldNotice>
          )}
          <h2 className="text-xl">Tóm tắt đơn hàng</h2>
          <OrderTotals
            subtotal={order.subtotal}
            discountTotal={order.discountTotal}
            grandTotal={order.grandTotal}
            promotion={order.promotion}
          />
          {order.status === 'pending_payment' ? (
            <>
              {exceeded && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>
                    Bạn đã thử thanh toán quá số lần cho phép với đơn này.
                  </AlertDescription>
                </Alert>
              )}
              {order.isPayable && !exceeded && (
                <Button size="lg" className="w-full" loading={startPayment.isPending} onClick={pay}>
                  <ShieldCheckIcon aria-hidden="true" />
                  Thanh toán lại
                </Button>
              )}
              {!order.isPayable && <p className="text-sm">Đơn này không còn có thể thanh toán.</p>}
            </>
          ) : (
            <>
              <p className="text-sm">
                {order.status === 'paid'
                  ? 'Đơn hàng đã được thanh toán.'
                  : order.status === 'expired'
                    ? 'Đơn hàng đã hết hạn.'
                    : 'Đơn hàng đã bị hủy.'}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/payment/result?orderId=${order.id}`}>Xem kết quả</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
