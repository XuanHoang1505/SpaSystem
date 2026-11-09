import { LockIcon } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useSettleLogout } from '@/features/auth/hooks/useSettleLogout';
import { useThemeScope } from '@/stores/themeScopeStore';
import { Brand } from '../Brand/Brand';
import { SkipLink } from '../SkipLink/SkipLink';

/** Focused shell for the checkout and the payment result: logo and a secure-payment note, no site menu. */
export function CheckoutLayout() {
  useThemeScope('light-only');
  useSettleLogout();
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <header className="border-b bg-background/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand />
          <span className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <LockIcon className="size-4" aria-hidden="true" />
            Thanh toán an toàn
          </span>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 outline-none sm:px-6 lg:px-8"
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
