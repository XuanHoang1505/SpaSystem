import {
  AwardIcon,
  BarChart3Icon,
  BellIcon,
  BotIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  HistoryIcon,
  HomeIcon,
  InfoIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PhoneIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
  WalletCardsIcon,
  type LucideIcon,
} from 'lucide-react';
import { routes } from '@app/routes';

export type Workspace = keyof typeof routes;

export interface NavigationItem {
  path: string;
  title: string;
  icon: LucideIcon;
}

export const workspaceLabels: Record<Exclude<Workspace, 'public'>, string> = {
  customer: 'Không gian cá nhân',
  staff: 'Không gian nhân viên',
  owner: 'Không gian quản lý',
};

// Icon theo đường dẫn; route không có ở đây dùng icon mặc định.
const icons: Record<string, LucideIcon> = {
  '/': HomeIcon,
  '/services': SparklesIcon,
  '/packages': PackageIcon,
  '/about': InfoIcon,
  '/contact': PhoneIcon,
  '/account': UserIcon,
  '/cart': ShoppingCartIcon,
  '/my-orders': ReceiptTextIcon,
  '/my-bookings': CalendarCheckIcon,
  '/my-treatment-plans': CalendarClockIcon,
  '/my-history': HistoryIcon,
  '/my-packages': WalletCardsIcon,
  '/my-reviews': StarIcon,
  '/notifications': BellIcon,
  '/ai-assistant': BotIcon,
  '/staff': LayoutDashboardIcon,
  '/staff/schedule': CalendarDaysIcon,
  '/staff/bookings': CalendarCheckIcon,
  '/staff/care-history': HistoryIcon,
  '/staff/certifications': AwardIcon,
  '/staff/notifications': BellIcon,
  '/owner': LayoutDashboardIcon,
  '/owner/services': SparklesIcon,
  '/owner/packages': PackageIcon,
  '/owner/staff': UsersIcon,
  '/owner/bookings': CalendarCheckIcon,
  '/owner/promotions': TagIcon,
  '/owner/treatments': CalendarClockIcon,
  '/owner/orders': ReceiptTextIcon,
  '/owner/reviews': StarIcon,
  '/owner/accounts': UserCogIcon,
  '/owner/reports': BarChart3Icon,
  '/owner/notifications': BellIcon,
};

const links = (entries: readonly (readonly [string, string])[]): NavigationItem[] =>
  entries
    .filter(([path]) => !path.includes(':'))
    .map(([path, title]) => ({ path, title, icon: icons[path] ?? LayoutDashboardIcon }));

/** Menu sinh từ `routes.ts`; không viết cứng menu trong component layout. */
export const navigation: Record<Workspace, readonly NavigationItem[]> = {
  // Auth pages are reached from the header buttons and the forms, not from the menu.
  public: links(routes.public).filter(
    ({ path }) => !['/login', '/register', '/forgot-password', '/ai-assistant'].includes(path),
  ),
  // The account menu lists my pages. The cart is reached from the header; checkout and the payment result need an
  // order or a cart in the URL, so they are reached from the cart.
  customer: links(routes.customer).filter(
    ({ path }) =>
      !['/cart', '/checkout', '/payment/result', '/booking/new', '/booking/success'].includes(path),
  ),
  // The profile is reached from the account menu at the bottom of the sidebar, not from the menu itself.
  staff: links(routes.staff).filter(({ path }) => path !== '/staff/account'),
  // Báo cáo doanh thu & KPI được đưa lên làm Dashboard chính tại `/owner`.
  owner: links(routes.owner).filter(
    ({ path }) => path !== '/owner/reports' && path !== '/owner/account',
  ),
};

export interface NavigationGroup {
  /** `null`: no heading (the first group, e.g. the overview). */
  label: string | null;
  items: readonly NavigationItem[];
}

type SidebarWorkspace = Exclude<Workspace, 'public'>;

/**
 * Sidebar groups per workspace, as [heading, paths] in menu order. A workspace left out shows one group headed by its
 * workspace label. A menu item missing from every group is never dropped: it goes to a last group without a heading.
 */
const groupLayout: Partial<
  Record<SidebarWorkspace, readonly (readonly [string | null, readonly string[]])[]>
> = {
  owner: [
    [null, ['/owner']],
    ['Vận hành', ['/owner/bookings', '/owner/treatments', '/owner/orders']],
    ['Danh mục', ['/owner/services', '/owner/packages', '/owner/promotions']],
    ['Khách hàng', ['/owner/reviews', '/owner/accounts']],
    ['Nhân sự', ['/owner/staff']],
    ['Hệ thống', ['/owner/notifications']],
  ],
  staff: [
    [null, ['/staff']],
    ['Công việc', ['/staff/schedule', '/staff/bookings', '/staff/care-history']],
    ['Cá nhân', ['/staff/certifications', '/staff/notifications']],
  ],
};

function groupItems(workspace: SidebarWorkspace): readonly NavigationGroup[] {
  const items = navigation[workspace];
  const layout = groupLayout[workspace];
  if (!layout) return [{ label: workspaceLabels[workspace], items }];

  const byPath = new Map(items.map((item) => [item.path, item]));
  const groups: NavigationGroup[] = layout
    .map(([label, paths]) => ({
      label,
      items: paths.flatMap((path) => {
        const item = byPath.get(path);
        byPath.delete(path);
        return item ? [item] : [];
      }),
    }))
    .filter((group) => group.items.length > 0);
  const rest = items.filter((item) => byPath.has(item.path));
  return rest.length > 0 ? [...groups, { label: null, items: rest }] : groups;
}

/** The sidebar menu of each signed-in workspace, split into groups. */
export const navigationGroups: Record<SidebarWorkspace, readonly NavigationGroup[]> = {
  customer: groupItems('customer'),
  staff: groupItems('staff'),
  owner: groupItems('owner'),
};
