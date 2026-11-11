import {
  BarChart3Icon,
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
  '/ai-assistant': BotIcon,
  '/staff': LayoutDashboardIcon,
  '/staff/schedule': CalendarDaysIcon,
  '/staff/bookings': CalendarCheckIcon,
  '/staff/care-history': HistoryIcon,
  '/owner': LayoutDashboardIcon,
  '/owner/services': SparklesIcon,
  '/owner/packages': PackageIcon,
  '/owner/staff': UsersIcon,
  '/owner/bookings': CalendarCheckIcon,
  '/owner/promotions': TagIcon,
  '/owner/treatments': CalendarClockIcon,
  '/owner/orders': ReceiptTextIcon,
  '/owner/reports': BarChart3Icon,
};

const links = (entries: readonly (readonly [string, string])[]): NavigationItem[] =>
  entries
    .filter(([path]) => !path.includes(':'))
    .map(([path, title]) => ({ path, title, icon: icons[path] ?? LayoutDashboardIcon }));

/** Menu sinh từ `routes.ts`; không viết cứng menu trong component layout. */
export const navigation: Record<Workspace, readonly NavigationItem[]> = {
  // Auth pages are reached from the header buttons and the forms, not from the menu.
  public: links(routes.public).filter(
    ({ path }) => !['/login', '/register', '/forgot-password'].includes(path),
  ),
  // The account menu lists my pages. The cart is reached from the header; checkout and the payment result need an
  // order or a cart in the URL, so they are reached from the cart.
  customer: links(routes.customer).filter(
    ({ path }) =>
      !['/cart', '/checkout', '/payment/result', '/booking/new', '/booking/success'].includes(path),
  ),
  staff: links(routes.staff),
  // Báo cáo doanh thu & KPI được đưa lên làm Dashboard chính tại `/owner`.
  owner: links(routes.owner).filter(({ path }) => path !== '/owner/reports'),
};
