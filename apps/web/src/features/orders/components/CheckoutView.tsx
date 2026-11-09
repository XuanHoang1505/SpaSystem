import { ShieldCheckIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { OrderRequest } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { redirectTo } from '@/features/payments/redirect';
import { useStartPayment } from '@/features/payments/hooks/useStartPayment';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency } from '@/lib/formatting/formatters';
import { newUuid } from '@/lib/uuid';
import { checkoutPath, parseCheckoutParams } from '../checkoutParams';
import { orderErrorCode, orderErrorMessage } from '../errors';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { useOrderPreview } from '../hooks/useOrderPreview';
import { CheckoutSteps } from './CheckoutSteps';
import { CustomerInfoCard } from './CustomerInfoCard';
import { ExistingOrderCheckout } from './ExistingOrderCheckout';
import { HoldNotice, OrderLines, OrderTotals, PaymentMethodCard } from './OrderSummary';
import { OrdersBreadcrumb } from './OrdersBreadcrumb';
import { OrdersErrorState } from './OrdersErrorState';
import { PromotionField } from './PromotionField';

/** Smallest total VNPay accepts (`Vnpay:MinAmount`); the API decides, this only warns early. */
export const MIN_PAYMENT_AMOUNT = 5000;

/** SCR-W11 — Thanh toán (UC-SPA-11): prepare an order from the cart or buy now, or pay an existing one. */
export function CheckoutView({ search }: { search: URLSearchParams }) {
  useDocumentTitle('Thanh toán');
  const params = parseCheckoutParams(search);
  return (
    <div className="space-y-2">
      <OrdersBreadcrumb trail={[{ label: 'Giỏ hàng', to: '/cart' }, { label: 'Thanh toán' }]} />
      <CheckoutSteps current={2} />
      <PageHeader
        title="Xác nhận & thanh toán đơn hàng"
        description="Kiểm tra đơn hàng trước khi thanh toán."
      />
      {!params.ok ? (
        <EmptyState
          title="Liên kết thanh toán không hợp lệ"
          description="Hãy quay lại giỏ hàng và chọn thanh toán lại."
          action={
            <Button asChild>
              <Link to="/cart">Về giỏ hàng</Link>
            </Button>
          }
        />
      ) : params.mode === 'existing' ? (
        <ExistingOrderCheckout orderId={params.orderId} />
      ) : (
        <PrepareCheckout baseRequest={params.request} />
      )}
    </div>
  );
}

function PrepareCheckout({ baseRequest }: { baseRequest: OrderRequest }) {
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const request: OrderRequest = code ? { ...baseRequest, promotionCode: code } : baseRequest;
  const preview = useOrderPreview(request);
  const createOrder = useCreateOrder();
  const startPayment = useStartPayment();
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const keyRef = useRef<{ signature: string; key: string } | null>(null);

  const data = preview.data;
  // A code that does not apply is left out of the order, so the order matches the totals on screen.
  const effective: OrderRequest = data?.promotionError ? baseRequest : request;
  const keyFor = (value: OrderRequest) => {
    const signature = JSON.stringify(value);
    if (keyRef.current?.signature !== signature) keyRef.current = { signature, key: newUuid() };
    return keyRef.current.key;
  };

  const confirm = async () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      const order = await createOrder.mutateAsync({
        request: effective,
        idempotencyKey: keyFor(effective),
      });
      if (order.status === 'paid') {
        // Leaving the page: stay busy so a late second click cannot start another order.
        navigate(`/payment/result?orderId=${order.id}`);
        return;
      }
      try {
        const attempt = await startPayment.mutateAsync(order.id);
        redirectTo(attempt.paymentUrl);
      } catch (paymentError) {
        toast.error(orderErrorMessage(paymentError));
        navigate(checkoutPath({ orderId: order.id }), { replace: true });
      }
    } catch (createError) {
      busy.current = false;
      setError(orderErrorMessage(createError));
      const errorCode = orderErrorCode(createError);
      if (errorCode === 'order_items_unavailable' || errorCode?.startsWith('promotion_'))
        void preview.refetch();
    }
  };

  if (preview.isPending)
    return (
      <div
        data-testid="checkout-skeleton"
        className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  if (preview.isError)
    return (
      <OrdersErrorState
        error={preview.error}
        title="Không tải được đơn hàng"
        onRetry={() => void preview.refetch()}
        retrying={preview.isFetching}
      />
    );
  if (!data) return null;

  if (data.items.length === 0)
    return (
      <div className="space-y-4">
        <EmptyState
          title="Không còn sản phẩm để thanh toán"
          description="Các sản phẩm trong đơn không còn bán."
          action={
            <Button asChild>
              <Link to="/cart">Về giỏ hàng</Link>
            </Button>
          }
        />
        <UnavailableAlert names={data.unavailableItems.map((item) => item.name)} />
      </div>
    );

  const tooSmall = data.grandTotal > 0 && data.grandTotal < MIN_PAYMENT_AMOUNT;
  return (
    <div
      aria-busy={preview.isPlaceholderData}
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 pb-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0"
    >
      <div className="space-y-6">
        <UnavailableAlert names={data.unavailableItems.map((item) => item.name)} />
        <OrderLines
          lines={data.items.map((item) => ({
            key: `${item.type}-${item.productId}`,
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
          <HoldNotice>
            Đơn được giữ {catalogPolicies.paymentTimeoutMinutes} phút kể từ khi bạn xác nhận để hoàn
            tất thanh toán.
          </HoldNotice>
          <h2 className="text-xl">Tóm tắt đơn hàng</h2>
          <PromotionField
            applied={data.promotion}
            error={data.promotionError}
            pending={preview.isFetching}
            onApply={setCode}
            onRemove={() => setCode(null)}
          />
          <OrderTotals
            subtotal={data.subtotal}
            discountTotal={data.discountTotal}
            grandTotal={data.grandTotal}
            promotion={data.promotion}
          />
          {tooSmall && (
            <Alert>
              <AlertDescription>Giá trị thanh toán tối thiểu là 5.000 đ.</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            size="lg"
            className="h-auto min-h-11 w-full py-2 whitespace-normal"
            disabled={tooSmall}
            loading={createOrder.isPending || startPayment.isPending}
            onClick={() => void confirm()}
          >
            <ShieldCheckIcon aria-hidden="true" />
            Thanh toán VNPay ({formatCurrency(data.grandTotal)})
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Bạn sẽ được chuyển sang cổng VNPay để hoàn tất thanh toán.
          </p>
        </CardContent>
      </Card>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden"
      >
        <div>
          <p className="text-xs text-muted-foreground">Tổng thanh toán</p>
          <p className="font-heading text-xl font-semibold text-primary">
            {formatCurrency(data.grandTotal)}
          </p>
        </div>
        <Button
          tabIndex={-1}
          disabled={tooSmall}
          loading={createOrder.isPending || startPayment.isPending}
          onClick={() => void confirm()}
        >
          Thanh toán
        </Button>
      </div>
    </div>
  );
}

function UnavailableAlert({ names }: { names: readonly string[] }) {
  if (names.length === 0) return null;
  return (
    <Alert>
      <AlertDescription>
        Các sản phẩm sau không còn bán và không được tính: {names.join(', ')}.{' '}
        <Link to="/cart" className="underline">
          Về giỏ hàng
        </Link>
      </AlertDescription>
    </Alert>
  );
}
