import { NavLink, useLocation } from 'react-router-dom';
import { navigation } from '@/config/navigation';
import { AccountMenu } from '@/features/auth/components/AccountMenu';
import { CartButton } from '@/features/orders';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { Brand } from '../Brand/Brand';
import { MobileNavigation } from '../MobileNavigation/MobileNavigation';

const publicLinks = navigation.public.filter(({ path }) => path !== '/');

const navLinkClasses = (active: boolean) =>
  cn(
    'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:text-foreground',
    active
      ? 'bg-primary/8 font-semibold text-primary after:absolute after:bottom-0.5 after:left-3.5 after:right-3.5 after:h-0.5 after:rounded-full after:bg-primary'
      : 'text-muted-foreground hover:bg-muted/50',
  );

export function Header() {
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');
  const isCustomerActive = pathname.startsWith('/account') || pathname.startsWith('/my-');

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:h-24 sm:px-6 lg:px-8">
        <Brand />
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1.5 md:flex">
          {publicLinks.map(({ path, title }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              {title}
            </NavLink>
          ))}
          <NavLink
            to="/account"
            className={navLinkClasses(isCustomerActive)}
          >
            Cá nhân
          </NavLink>
        </nav>
        <div className="flex items-center gap-2 sm:gap-2.5">
          {isAuthenticated && (
            <>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <CartButton />
                <NotificationBell />
              </div>
              <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
            </>
          )}
          <div className={cn('flex items-center', isAuthenticated && 'pl-1 sm:pl-0')}>
            <AccountMenu />
          </div>
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
