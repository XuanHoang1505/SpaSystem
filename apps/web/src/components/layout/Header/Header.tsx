import { NavLink } from 'react-router-dom';
import { navigation } from '@/config/navigation';
import { AccountMenu } from '@/features/auth/components/AccountMenu';
import { CartButton } from '@/features/orders';
import { cn } from '@/lib/utils';
import { Brand } from '../Brand/Brand';
import { MobileNavigation } from '../MobileNavigation/MobileNavigation';

const publicLinks = navigation.public.filter(({ path }) => path !== '/');

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
          {publicLinks.map(({ path, title }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              {title}
            </NavLink>
          ))}
          <NavLink
            to="/account"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cá nhân
          </NavLink>
        </nav>
        <div className="flex items-center gap-1">
          <CartButton />
          <AccountMenu />
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
