import { Outlet } from 'react-router-dom';
import { AccountSideNav } from './AccountSideNav';

/**
 * "Khu vực khách hàng": my pages share one calm shell (the site header above) with a floating account menu on
 * the left from `lg`, and a scrollable row of pills above the content on small screens. Staff and owner keep the
 * admin sidebar (`WorkspaceLayout`).
 */
export function AccountLayout() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <AccountSideNav />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
