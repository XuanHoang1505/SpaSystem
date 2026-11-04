import { NavLink, useLocation } from 'react-router-dom';
import { navigation, workspaceLabels, type Workspace } from '@/config/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Brand } from '../Brand/Brand';

export function WorkspaceSidebar({ workspace }: { workspace: Exclude<Workspace, 'public'> }) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center border-b px-3">
        <Brand className="group-data-[collapsible=icon]:hidden" />
        <Brand compact className="hidden group-data-[collapsible=icon]:flex" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{workspaceLabels[workspace]}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu id="workspace-nav" aria-label="Menu không gian">
              {navigation[workspace].map(({ path, title, icon: Icon }) => (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton asChild isActive={pathname === path} tooltip={title}>
                    <NavLink to={path} end onClick={() => setOpenMobile(false)}>
                      <Icon aria-hidden="true" />
                      <span>{title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        Bản nền tảng · Chưa có xác thực
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
