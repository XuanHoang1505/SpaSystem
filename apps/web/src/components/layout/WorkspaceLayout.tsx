import { Outlet } from 'react-router-dom';
import { workspaceLabels, type Workspace } from '@/config/navigation';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/shared/ThemeToggle/ThemeToggle';
import { useThemeScope } from '@/stores/themeScopeStore';
import { SkipLink } from './SkipLink/SkipLink';
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
      <SidebarInset id="main-content" tabIndex={-1} className="outline-none">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Mở hoặc thu gọn menu" />
          <Separator orientation="vertical" className="mx-1 h-5!" />
          <span className="truncate text-sm text-muted-foreground">
            {workspaceLabels[workspace]}
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="bg-status-warning px-4 py-2 text-center text-xs text-status-warning-foreground">
          Bản xem trước giao diện · Dữ liệu nghiệp vụ đang được phát triển
        </div>
        <div className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
