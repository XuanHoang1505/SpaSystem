import { LockIcon } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSettleLogout } from '@/features/auth/hooks/useSettleLogout';
import { CheckoutSteps } from '@/features/orders/components/CheckoutSteps';
import { useThemeScope } from '@/stores/themeScopeStore';
import { Brand } from '../Brand/Brand';
import { SkipLink } from '../SkipLink/SkipLink';

/** The step of the purchase each focused page is (the cart is step 1, in the customer shell). */
const stepOf = (pathname: string): 2 | 3 => (pathname.startsWith('/payment/result') ? 3 : 2);

/**
 * Focused shell for the checkout and the payment result: logo, the purchase steps and a secure-payment note, no site menu.
 * The steps live here, not in each page, so the page starts with its own content.
 */
export function CheckoutLayout() {
  useThemeScope('light-only');
  useSettleLogout();
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
          <Brand imgClassName="h-11 max-w-[130px] sm:h-16 sm:max-w-[220px]" />
          <CheckoutSteps current={stepOf(pathname)} />
          <span className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 text-xs font-medium text-muted-foreground sm:px-3 sm:py-1.5">
            <LockIcon className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Thanh toán an toàn</span>
          </span>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8"
      >
        <Outlet />
      </main>
      <footer className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          Như Nguyệt Spa · Thông tin thanh toán được xử lý qua cổng VNPay.
        </p>
      </footer>
    </div>
  );
}
