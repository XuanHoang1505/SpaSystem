import {
  BarChart3Icon,
  BotIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  HomeIcon,
  LayoutDashboardIcon,
  PackageIcon,
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
  '/account': UserIcon,
  '/my-bookings': CalendarCheckIcon,
  '/my-treatment-plans': CalendarClockIcon,
  '/my-packages': WalletCardsIcon,
  '/my-reviews': StarIcon,
  '/ai-assistant': BotIcon,
  '/staff': LayoutDashboardIcon,
  '/staff/schedule': CalendarDaysIcon,
  '/staff/bookings': CalendarCheckIcon,
  '/owner': LayoutDashboardIcon,
  '/owner/services': SparklesIcon,
  '/owner/packages': PackageIcon,
  '/owner/staff': UsersIcon,
  '/owner/bookings': CalendarCheckIcon,
  '/owner/promotions': TagIcon,
  '/owner/treatments': CalendarClockIcon,
  '/owner/payments': CreditCardIcon,
  '/owner/reports': BarChart3Icon,
};

const links = (entries: readonly (readonly [string, string])[]): NavigationItem[] =>
  entries
    .filter(([path]) => !path.includes(':'))
    .map(([path, title]) => ({ path, title, icon: icons[path] ?? LayoutDashboardIcon }));

/** Menu sinh từ `routes.ts`; không viết cứng menu trong component layout. */
export const navigation: Record<Workspace, readonly NavigationItem[]> = {
  public: links(routes.public).filter(({ path }) => !['/login', '/register'].includes(path)),
  customer: links(routes.customer),
  staff: links(routes.staff),
  owner: links(routes.owner),
};
