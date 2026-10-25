import { NavLink } from 'react-router-dom';
export function MobileNavigation() {
  return (
    <nav id="workspace-nav" className="mobile-navigation" aria-label="Menu di động">
      <NavLink to="/" end>
        Trang chủ
      </NavLink>
      <NavLink to="/services">Dịch vụ</NavLink>
      <NavLink to="/packages">Gói chăm sóc</NavLink>
      <NavLink to="/account">Cá nhân</NavLink>
    </nav>
  );
}
