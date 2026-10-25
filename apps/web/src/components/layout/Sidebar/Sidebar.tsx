import { NavLink } from 'react-router-dom';
import { navigation, type Workspace } from '@/config/navigation';
import { useUIStore } from '@/stores/uiStore';
export function Sidebar({ workspace }: { workspace: Workspace }) {
  const open = useUIStore((state) => state.sidebarOpen);
  const close = useUIStore((state) => state.closeSidebar);
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <p className="eyebrow">
        KHÔNG GIAN{' '}
        {workspace === 'owner' ? 'QUẢN LÝ' : workspace === 'staff' ? 'NHÂN VIÊN' : 'CÁ NHÂN'}
      </p>
      <nav id="workspace-nav" aria-label="Menu không gian">
        {navigation[workspace].map(([path, title]) => (
          <NavLink key={path} to={path} end onClick={close}>
            {title}
          </NavLink>
        ))}
      </nav>
      <small>Bản nền tảng · Chưa có xác thực</small>
    </aside>
  );
}
