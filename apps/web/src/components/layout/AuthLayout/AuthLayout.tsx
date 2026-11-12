import { Link, Outlet } from 'react-router-dom';
import { ArrowLeftIcon, CalendarCheckIcon, CreditCardIcon, ListChecksIcon } from 'lucide-react';
import authBackground from '@/assets/images/auth-spa.jpg';
import { useSettleLogout } from '@/features/auth/hooks/useSettleLogout';
import { useThemeScope } from '@/stores/themeScopeStore';
import { Brand } from '../Brand/Brand';
import { SkipLink } from '../SkipLink/SkipLink';

// Only features the system really has; no medical claims (docs/design/stitch.md).
const highlights = [
  {
    icon: CalendarCheckIcon,
    title: 'Đặt lịch hẹn trực tuyến',
    text: 'Chọn dịch vụ, ngày giờ và kỹ thuật viên phù hợp.',
  },
  {
    icon: ListChecksIcon,
    title: 'Theo dõi tiến độ liệu trình',
    text: 'Xem các buổi đã làm và buổi tiếp theo của gói.',
  },
  {
    icon: CreditCardIcon,
    title: 'Mua dịch vụ, gói và thanh toán trực tuyến',
    text: 'Thanh toán qua VNPay, dùng dần theo từng buổi.',
  },
] as const;

/**
 * Login, register and forgot-password (SCR-W07..W09): split card without the site header and footer, always light.
 * The intro panel is hidden below `lg`, where the brand moves above the form.
 */
export function AuthLayout() {
  useThemeScope('light-only');
  useSettleLogout();
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background">
      {/* The photo fills the space around the card; a light cream veil keeps it calm. */}
      <img
        src={authBackground}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 -z-10 size-full object-cover"
      />
      <span aria-hidden="true" className="fixed inset-0 -z-10 bg-background/30" />
      <SkipLink />
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid w-full overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[1fr_1.1fr]">
          <aside
            aria-label="Giới thiệu Spa Như Nguyệt"
            className="relative hidden flex-col gap-8 overflow-hidden border-r bg-muted p-8 lg:flex"
          >
            <span
              aria-hidden="true"
              className="absolute -top-16 -right-16 size-56 rounded-full bg-accent"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-24 -left-10 size-72 rounded-full bg-secondary/70"
            />
            <div className="relative grid gap-6">
              <Brand />
              <div className="grid gap-3">
                <h2 className="font-heading text-4xl leading-tight font-medium tracking-tight">
                  Chăm sóc làn da <em className="text-primary">theo cách của bạn</em>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Đặt lịch, theo dõi liệu trình và quản lý gói chăm sóc của bạn tại Spa Như Nguyệt.
                </p>
              </div>
            </div>
            <ul className="relative grid gap-3">
              {highlights.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3 rounded-xl border bg-card p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">{title}</span>
                    <span className="text-xs text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
          <main
            id="main-content"
            tabIndex={-1}
            className="flex flex-col gap-4 px-6 py-5 outline-none sm:px-10 sm:py-6 lg:px-12"
          >
            <div className="flex items-center justify-between gap-4">
              <Brand compact className="sm:hidden" />
              <Brand className="hidden sm:flex lg:hidden" />
              <Link
                to="/"
                className="ml-auto inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="size-4" aria-hidden="true" />
                Về trang chủ
              </Link>
            </div>
            <div className="mx-auto w-full max-w-md">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
