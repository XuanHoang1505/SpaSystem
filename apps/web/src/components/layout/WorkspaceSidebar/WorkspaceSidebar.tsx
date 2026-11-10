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
import { SidebarAccount } from '@/features/auth/components/SidebarAccount';
import { Brand } from '../Brand/Brand';

export function WorkspaceSidebar({ workspace }: { workspace: Exclude<Workspace, 'public'> }) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center border-b px-3">
        <Brand className="group-data-[collapsible=icon]:hidden" imgClassName="h-11 sm:h-11 max-w-[150px]" />
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
      <SidebarFooter className="border-t px-3 py-2">
        <SidebarAccount />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
