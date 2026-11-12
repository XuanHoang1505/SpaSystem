import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronsUpDownIcon,
  KeyRoundIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type { AuthUser } from '@spa/shared-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '../hooks/useLogout';
import { roleLabels } from '../navigation';
import { initialOf } from './AccountMenu';

const themes = [
  { value: 'light', label: 'Sáng', icon: SunIcon },
  { value: 'dark', label: 'Tối', icon: MoonIcon },
  { value: 'system', label: 'Theo hệ thống', icon: MonitorIcon },
] as const;

function UserAvatar({ user, className }: { user: AuthUser; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-accent font-medium text-accent-foreground">
        {initialOf(user.fullName)}
      </AvatarFallback>
    </Avatar>
  );
}

/** The menu shared by the header avatar and the sidebar footer of the staff/owner workspaces. */
function AccountMenuContent({
  user,
  side,
  align,
}: {
  user: AuthUser;
  side: 'bottom' | 'top' | 'right';
  align: 'start' | 'end';
}) {
  const logout = useLogout();
  const { theme = 'system', setTheme } = useTheme();
  return (
    <DropdownMenuContent side={side} align={align} sideOffset={8} className="w-64">
      <DropdownMenuLabel className="grid gap-1 py-2">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{user.fullName}</span>
          <Badge className="shrink-0 border-transparent bg-accent text-[11px] font-semibold text-accent-foreground uppercase">
            {roleLabels[user.role]}
          </Badge>
        </span>
        <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to="/account">
          <UserIcon aria-hidden="true" />
          Hồ sơ cá nhân
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/account#doi-mat-khau">
          <KeyRoundIcon aria-hidden="true" />
          Đổi mật khẩu
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <SunIcon className="dark:hidden" aria-hidden="true" />
          <MoonIcon className="hidden dark:block" aria-hidden="true" />
          Giao diện
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            {themes.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon aria-hidden="true" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => logout.mutate()}>
        <LogOutIcon aria-hidden="true" />
        Đăng xuất
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function useSignedInUser() {
  return useAuthStore((state) => state.user);
}

/** Header (top right) of the workspaces: the avatar opens the account menu. */
export function WorkspaceHeaderAccountMenu() {
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu tài khoản">
          <UserAvatar user={user} className="size-8" />
        </Button>
      </DropdownMenuTrigger>
      <AccountMenuContent user={user} side="bottom" align="end" />
    </DropdownMenu>
  );
}

/** Sidebar footer of the workspaces: avatar, name and email; opens the same menu (to the right when collapsed). */
export function WorkspaceSidebarAccountMenu() {
  const user = useSignedInUser();
  const { isMobile, state } = useSidebar();
  if (!user) return null;
  const side = isMobile ? 'top' : state === 'collapsed' ? 'right' : 'top';
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={`Tài khoản: ${user.fullName}`}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar user={user} className="size-8" />
              <SidebarIdentity name={user.fullName} detail={user.email} />
              <ChevronsUpDownIcon className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <AccountMenuContent user={user} side={side} align="end" />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SidebarIdentity({ name, detail }: { name: string; detail: ReactNode }) {
  return (
    <span className="grid min-w-0 flex-1 text-left leading-tight">
      <span className="truncate text-sm font-medium">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{detail}</span>
    </span>
  );
}
