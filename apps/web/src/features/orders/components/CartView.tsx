import {
  ArrowLeftIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  SparklesIcon,
} from 'lucide-react';
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
    <div className="space-y-4">
      <OrdersBreadcrumb trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Giỏ hàng' }]} />
      <div className="space-y-4 pb-2">
        <CheckoutSteps current={1} />
        <PageHeader
          className="pb-0"
          title="Giỏ hàng của bạn"
          description={
            cart && cart.items.length > 0
              ? `${cart.itemCount} sản phẩm đang chờ bạn. Xem lại trước khi thanh toán.`
              : 'Xem lại các dịch vụ và gói liệu trình trước khi thanh toán.'
          }
        />
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
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section
              ref={listRef}
              tabIndex={-1}
              aria-label="Sản phẩm trong giỏ"
              className="min-w-0 space-y-6 outline-none"
            >
              {cart.items.some((item) => !item.isAvailable) && (
                <Alert>
                  <AlertDescription>
                    Một số sản phẩm không còn bán. Chúng sẽ không được tính khi thanh toán.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Dịch vụ &amp; Gói đã chọn
                  </h2>
                  <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                    {cart.itemCount} sản phẩm
                  </span>
                </div>
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
                <div className="pt-1">
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link to="/services">
                      <ArrowLeftIcon className="size-4" aria-hidden="true" />
                      Tiếp tục chọn thêm dịch vụ
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Special Spa Perks & Reassurance card */}
              <div className="space-y-4 rounded-2xl border bg-card/60 p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4.5 text-primary" aria-hidden="true" />
                  <h3 className="font-heading font-semibold text-foreground">
                    Đặc quyền khi mua dịch vụ tại Như Nguyệt Spa
                  </h3>
                </div>
                <div className="grid gap-3 pt-1 sm:grid-cols-3">
                  <div className="space-y-1.5 rounded-xl border bg-background/70 p-3.5 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CalendarCheckIcon className="size-4 text-primary" aria-hidden="true" />
                      Chủ động đặt lịch
                    </p>
                    <p className="leading-relaxed text-muted-foreground">
                      Sau khi mua, bạn tự do chọn ngày, giờ và chuyên viên trực tuyến 24/7.
                    </p>
                  </div>
                  <div className="space-y-1.5 rounded-xl border bg-background/70 p-3.5 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" />
                      Bảo lưu thời hạn
                    </p>
                    <p className="leading-relaxed text-muted-foreground">
                      Hỗ trợ bảo lưu và gia hạn linh hoạt nếu bạn bận lịch trình cá nhân.
                    </p>
                  </div>
                  <div className="space-y-1.5 rounded-xl border bg-background/70 p-3.5 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CheckCircle2Icon className="size-4 text-primary" aria-hidden="true" />
                      Đổi lịch miễn phí
                    </p>
                    <p className="leading-relaxed text-muted-foreground">
                      Được đổi hoặc hủy lịch hẹn trước 24 giờ hoàn toàn không tính phí.
                    </p>
                  </div>
                </div>
              </div>
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
