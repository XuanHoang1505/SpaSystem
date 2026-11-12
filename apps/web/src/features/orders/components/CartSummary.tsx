import { ArrowRightIcon, CalendarClockIcon, CreditCardIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Cart } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { formatCurrency } from '@/lib/formatting/formatters';
import { checkoutPath } from '../checkoutParams';

/** "Tóm tắt đơn hàng": total of the lines still on sale and the way to the checkout. */
export function CartSummary({ cart }: { cart: Cart }) {
  const available = cart.items.filter((item) => item.isAvailable).length;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm lg:sticky lg:top-28">
      <div className="border-b bg-muted/40 p-5 sm:p-6">
        <h2 className="font-heading text-xl font-semibold text-foreground">Tóm tắt đơn hàng</h2>
        <p className="text-xs text-muted-foreground">Kiểm tra số lượng và tổng thanh toán</p>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Tạm tính ({available} mục)</span>
            <span className="font-medium text-foreground">{formatCurrency(cart.totalAmount)}</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-3">
            <span className="shrink-0 font-heading text-lg font-semibold text-foreground">
              Tổng thanh toán
            </span>
            <span className="font-heading text-2xl font-bold text-primary sm:text-3xl">
              {formatCurrency(cart.totalAmount)}
            </span>
          </div>
        </div>
        {available > 0 ? (
          <Button asChild size="lg" className="group w-full font-medium shadow-xs">
            <Link to={checkoutPath({ source: 'cart' })}>
              Tiến hành thanh toán
              <ArrowRightIcon
                aria-hidden="true"
                className="transition-transform motion-safe:group-hover:translate-x-1"
              />
            </Link>
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled>
            Tiến hành thanh toán
          </Button>
        )}
        <ul className="space-y-2.5 border-t pt-4 text-xs text-muted-foreground">
          <li className="flex items-start gap-2.5">
            <CalendarClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Đổi hoặc hủy lịch hẹn linh hoạt trước {catalogPolicies.customerChangeCutoffHours} giờ.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CreditCardIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Thanh toán trực tuyến bảo mật qua cổng VNPay.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
