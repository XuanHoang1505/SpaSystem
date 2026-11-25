import { Outlet } from 'react-router-dom';
import type { Workspace } from '@/config/navigation';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/shared/ThemeToggle/ThemeToggle';
import { WorkspaceHeaderAccountMenu } from '@/features/auth/components/WorkspaceAccountMenu';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { useThemeScope } from '@/stores/themeScopeStore';
import { QuickSearch } from './QuickSearch/QuickSearch';
import { SkipLink } from './SkipLink/SkipLink';
import { TodayLabel } from './TodayLabel/TodayLabel';
import { WorkspaceSidebar } from './WorkspaceSidebar/WorkspaceSidebar';

/** Admin shell (sidebar) for staff and owner. The customer area uses the site header instead (`AccountLayout`). */
export function WorkspaceLayout({
  workspace,
}: {
  workspace: Exclude<Workspace, 'public' | 'customer'>;
}) {
  useThemeScope('user');
  return (
    <SidebarProvider>
      <SkipLink />
      <WorkspaceSidebar workspace={workspace} />
      {/* min-w-0: a flex item may otherwise grow to its widest child (a table), scrolling the whole page sideways. */}
      <SidebarInset id="main-content" tabIndex={-1} className="min-w-0 outline-none">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-sidebar px-4">
          <SidebarTrigger className="-ml-1" aria-label="Mở hoặc thu gọn menu" />
          <Separator orientation="vertical" className="mx-1 h-5!" />
          <TodayLabel className="hidden items-center gap-2 text-sm text-muted-foreground md:flex lg:w-48" />
          <div className="flex flex-1 justify-end sm:justify-center">
            <QuickSearch workspace={workspace} />
          </div>
          <div className="flex items-center gap-1 lg:w-48 lg:justify-end">
            <ThemeToggle />
            <NotificationBell />
            <Separator orientation="vertical" className="mx-1 h-5!" />
            <WorkspaceHeaderAccountMenu />
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
