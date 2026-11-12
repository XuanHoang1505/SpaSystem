import { BotIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { navigation } from '@/config/navigation';
import { siteContact } from '@/features/services/catalogPolicies';
import { initialOf } from '@/features/auth/components/AccountMenu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

/** The given name is the last word of a Vietnamese full name: "Nguyễn Thị Mẫu" → "Mẫu". */
const givenName = (fullName: string) => fullName.trim().split(/\s+/).at(-1) ?? fullName;

/** Floating card on the left of my pages (profile, menu, help). Below `lg` only the menu remains, as pills. */
export function AccountSideNav() {
  const user = useAuthStore((state) => state.user);
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Small screens: keep the current page's pill in view inside the scrollable row.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [pathname]);
  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
      <div className="rounded-2xl border bg-card p-2 lg:p-5">
        {user && (
          <div className="mb-4 hidden flex-col items-center gap-2 border-b pb-5 text-center lg:flex">
            <Avatar className="size-16">
              <AvatarFallback className="bg-secondary font-heading text-2xl text-secondary-foreground">
                {initialOf(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <p className="font-heading text-xl">Chào {givenName(user.fullName)}</p>
            <p className="max-w-full truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}
        <nav
          ref={navRef}
          aria-label="Menu tài khoản"
          className="flex [scrollbar-width:none] gap-1 overflow-x-auto lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {navigation.customer.map(({ path, title, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {title}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="hidden space-y-3 rounded-2xl border bg-muted/50 p-5 lg:block">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <BotIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-heading text-lg leading-tight">Cần tư vấn?</p>
            <p className="text-xs text-muted-foreground">Trợ lý Như Nguyệt luôn sẵn sàng.</p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/ai-assistant">Hỏi trợ lý</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">{`Hotline: ${siteContact.hotline}`}</p>
      </div>
    </aside>
  );
}
