import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '../hooks/useLogout';
import { roleLabels } from '../navigation';

/** Sidebar footer of the workspaces: who is signed in and logout (icon only when collapsed). */
export function SidebarAccount() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <span className="truncate text-sm font-medium text-foreground">{user.fullName}</span>
        <span className="truncate text-xs text-muted-foreground">{roleLabels[user.role]}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Đăng xuất"
        loading={logout.isPending}
        onClick={() => logout.mutate()}
      >
        <LogOutIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
