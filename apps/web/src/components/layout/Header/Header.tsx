import { Link } from 'react-router-dom';
import { AppButton } from '@components/common/AppButton/AppButton';
import { useUIStore } from '@/stores/uiStore';
export function Header({ withSidebar = false }: { withSidebar?: boolean }) {
  const toggle = useUIStore((state) => state.toggleSidebar);
  const open = useUIStore((state) => state.sidebarOpen);
  return (
    <header className="header">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          N
        </span>
        <span>
          Như Nguyệt<small>SPA & CHĂM SÓC DA</small>
        </span>
      </Link>
      <nav className="header-nav" aria-label="Điều hướng chính">
        <Link to="/services">Dịch vụ</Link>
        <Link to="/packages">Gói chăm sóc</Link>
        <Link to="/account">Cá nhân</Link>
      </nav>
      {withSidebar && (
        <AppButton
          className="menu-toggle"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="workspace-nav"
          aria-label="Mở hoặc đóng menu"
        >
          Menu
        </AppButton>
      )}
    </header>
  );
}
