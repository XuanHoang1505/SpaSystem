import { Link } from 'react-router-dom';
import { LayoutDashboardIcon, LogOutIcon } from 'lucide-react';
import type { AuthUser } from '@spa/shared-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import { CurrentUserAvatarImage } from '@/features/users/components/CurrentUserAvatarImage';
import { useLogout } from '../hooks/useLogout';
import { workspacePathFor } from '../navigation';

/** Vietnamese names end with the given name: "Nguyễn Thị Lan" → "L". */
export const initialOf = (fullName: string) =>
  (fullName.trim().split(/\s+/).at(-1)?.charAt(0) ?? '?').toLocaleUpperCase('vi');

function SignedInMenu({ user }: { user: AuthUser }) {
  const logout = useLogout();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full p-0 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Tài khoản của bạn"
        >
          <Avatar className="size-9 border-2 border-background shadow-xs ring-1 ring-border/80 transition-all hover:ring-2 hover:ring-primary/40">
            <CurrentUserAvatarImage userId={user.id} />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initialOf(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate">{user.fullName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={workspacePathFor(user.role)}>
            <LayoutDashboardIcon aria-hidden="true" />
            Không gian của tôi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => logout.mutate()}>
          <LogOutIcon aria-hidden="true" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Header account area: placeholder while restoring, login/register links, or the account menu. */
export function AccountMenu() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  if (status === 'restoring')
    return <Skeleton data-testid="account-skeleton" className="hidden h-8 w-24 sm:block" />;
  if (status === 'authenticated' && user) return <SignedInMenu user={user} />;
  return (
    <div className="hidden items-center gap-1 sm:flex">
      <Button asChild variant="ghost" size="sm">
        <Link to="/register">Đăng ký</Link>
      </Button>
      <Button asChild size="sm">
        <Link to="/login">Đăng nhập</Link>
      </Button>
    </div>
  );
}

/** The same choices inside the mobile navigation sheet. */
export function MobileAccountActions({ onNavigate }: { onNavigate: () => void }) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  if (status === 'restoring') return null;
  if (status === 'authenticated' && user)
    return (
      <div className="mt-4 grid gap-2">
        <Button asChild variant="outline">
          <Link to={workspacePathFor(user.role)} onClick={onNavigate}>
            Không gian của tôi
          </Link>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onNavigate();
            logout.mutate();
          }}
        >
          Đăng xuất
        </Button>
      </div>
    );
  return (
    <div className="mt-4 grid gap-2">
      <Button asChild>
        <Link to="/login" onClick={onNavigate}>
          Đăng nhập
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/register" onClick={onNavigate}>
          Đăng ký
        </Link>
      </Button>
    </div>
  );
}
