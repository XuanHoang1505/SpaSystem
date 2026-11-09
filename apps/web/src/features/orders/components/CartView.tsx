import { ArrowLeftIcon, ShoppingCartIcon } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { CartItem } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { orderErrorCode, orderErrorMessage } from '../errors';
import { useCart } from '../hooks/useCart';
import { useRemoveCartItem } from '../hooks/useRemoveCartItem';
import { CartLine } from './CartLine';
import { CartSummary } from './CartSummary';
import { CheckoutSteps } from './CheckoutSteps';
import { OrdersBreadcrumb } from './OrdersBreadcrumb';
import { OrdersErrorState } from './OrdersErrorState';

/** SCR-W10 — Giỏ hàng (UC-SPA-10). */
export function CartView({ suggestions }: { suggestions?: ReactNode }) {
  useDocumentTitle('Giỏ hàng');
  const query = useCart();
  const remove = useRemoveCartItem();
  const [pending, setPending] = useState<CartItem | null>(null);
  const listRef = useRef<HTMLElement>(null);
  const removedRef = useRef(false);
  const cart = query.data;

  const confirmRemove = () => {
    if (!pending) return;
    remove.mutate(pending.id, {
      onSuccess: () => {
        removedRef.current = true;
      },
      onSettled: () => setPending(null),
      onError: (error) =>
        toast.error(
          orderErrorCode(error) === 'cart_item_not_found'
            ? 'Sản phẩm không còn trong giỏ'
            : orderErrorMessage(error),
        ),
    });
  };

  return (
    <div className="space-y-2">
      <OrdersBreadcrumb trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]} />
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-accent/50 px-5 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 -right-8 hidden size-36 rounded-full bg-secondary md:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -bottom-10 hidden h-28 w-44 rounded-t-full bg-chart-5/40 md:block"
        />
        <div className="relative">
          <CheckoutSteps current={1} />
          <PageHeader
            className="pb-0"
            title="Giỏ hàng"
            description={
              cart && cart.items.length > 0
                ? `${cart.itemCount} sản phẩm đang chờ bạn. Xem lại trước khi thanh toán.`
                : 'Xem lại các dịch vụ và gói liệu trình trước khi thanh toán.'
            }
          />
        </div>
      </div>
      {query.isPending ? (
        <div
          data-testid="cart-skeleton"
          className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
        >
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : query.isError ? (
        <OrdersErrorState
          error={query.error}
          title="Không tải được giỏ hàng"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : cart && cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingCartIcon}
          title="Giỏ hàng của bạn đang trống"
          description="Chọn dịch vụ hoặc gói liệu trình để bắt đầu."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/services">Khám phá dịch vụ</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/packages">Xem gói liệu trình</Link>
              </Button>
            </div>
          }
        />
      ) : (
        cart && (
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section
              ref={listRef}
              tabIndex={-1}
              aria-label="Sản phẩm trong giỏ"
              className="min-w-0 space-y-3 outline-none"
            >
              {cart.items.some((item) => !item.isAvailable) && (
                <Alert>
                  <AlertDescription>
                    Một số sản phẩm không còn bán. Chúng sẽ không được tính khi thanh toán.
                  </AlertDescription>
                </Alert>
              )}
              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <CartLine
                    key={item.id}
                    item={item}
                    onRemove={setPending}
                    removing={remove.isPending}
                  />
                ))}
              </ul>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeftIcon className="size-4" aria-hidden="true" />
                Tiếp tục chọn thêm dịch vụ
              </Link>
            </section>
            <CartSummary cart={cart} />
          </div>
        )
      )}
      {suggestions}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            // The trigger is gone after a removal: keep the focus in the page instead of losing it to the body.
            if (!removedRef.current) return;
            event.preventDefault();
            removedRef.current = false;
            listRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khỏi giỏ hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? `"${pending.name}" sẽ được xóa khỏi giỏ hàng của bạn.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmRemove();
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
