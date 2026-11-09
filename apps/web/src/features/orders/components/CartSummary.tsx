import { ArrowRightIcon, CalendarClockIcon, CreditCardIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Cart } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { formatCurrency } from '@/lib/formatting/formatters';
import { checkoutPath } from '../checkoutParams';

/** "Tóm tắt đơn hàng": total of the lines still on sale and the way to the checkout; promotions are applied there. */
export function CartSummary({ cart }: { cart: Cart }) {
  const available = cart.items.filter((item) => item.isAvailable).length;
  return (
    <Card className="bg-accent/30 lg:sticky lg:top-24">
      <CardContent className="space-y-5">
        <h2 className="text-2xl">Tóm tắt đơn hàng</h2>
        <div className="space-y-1 border-t pt-4">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Tạm tính ({available} mục)</span>
            <span>{formatCurrency(cart.totalAmount)}</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-3">
            <span className="shrink-0 font-heading text-lg">Tổng thanh toán</span>
            <span className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
              {formatCurrency(cart.totalAmount)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Mã khuyến mãi được áp ở bước thanh toán.</p>
        </div>
        {available > 0 ? (
          <Button asChild size="lg" className="group w-full">
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
        <p className="text-center text-xs text-muted-foreground">
          Sau khi thanh toán, dịch vụ được lưu vào tài khoản để bạn chủ động đặt lịch hẹn.
        </p>
        <ul className="space-y-3 border-t pt-4 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <CalendarClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Đổi hoặc hủy lịch hẹn trước {catalogPolicies.customerChangeCutoffHours} giờ.
          </li>
          <li className="flex items-start gap-3">
            <CreditCardIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Thanh toán trực tuyến qua VNPay.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
