import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { FaFacebookF, FaTiktok } from 'react-icons/fa6';
import { SiZalo } from 'react-icons/si';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  Clock4Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  type LucideIcon,
} from 'lucide-react';
import vnpayIcon from '@/assets/images/vnpay_icon.png';
import { siteInfo } from '@/config/siteInfo';
import { cn } from '@/lib/utils';

const quickLinks = [
  { to: '/services', label: 'Dịch vụ' },
  { to: '/packages', label: 'Gói liệu trình' },
  { to: '/ai-assistant', label: 'Trợ lý AI' },
  { to: '/about', label: 'Giới thiệu' },
  { to: '/contact', label: 'Liên hệ' },
] as const;

const accountLinks = [
  { to: '/my-bookings', label: 'Lịch hẹn của tôi' },
  { to: '/my-packages', label: 'Gói đã mua' },
  { to: '/my-orders', label: 'Đơn hàng của tôi' },
  { to: '/account', label: 'Tài khoản' },
] as const;

/** Policies without a page yet are listed as plain text. */
const supportItems = ['Chính sách bảo mật', 'Điều khoản sử dụng', 'Hướng dẫn đặt lịch'];

/** The Zalo mark is a wordmark, so it needs more room than the others to read at the same weight. */
const socialIcons: Record<
  (typeof siteInfo.socials)[number]['label'],
  { icon: IconType; size: string }
> = {
  Facebook: { icon: FaFacebookF, size: 'size-4' },
  Zalo: { icon: SiZalo, size: 'size-9' },
  TikTok: { icon: FaTiktok, size: 'size-4' },
};

const heading = 'text-sm font-semibold tracking-wide text-primary-foreground';
const linkClass =
  'rounded-sm text-primary-foreground/75 outline-none transition-colors hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary-foreground/60';
const socialClass =
  'grid size-10 place-items-center rounded-full border border-primary-foreground/25 text-primary-foreground transition-colors';

/** Public footer: a booking call to action, brand and socials, links, contact details (siteInfo) and payment. */
export function Footer() {
  const phoneHref = `tel:${siteInfo.phone.replace(/\s/g, '')}`;
  return (
    <footer className="mt-8 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Call to action */}
        <div className="flex flex-col gap-5 border-b border-primary-foreground/15 py-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p className="font-heading text-2xl sm:text-3xl">Dành cho mình một buổi thư giãn</p>
            <p className="text-sm text-primary-foreground/75">
              Chọn dịch vụ, ngày giờ và kỹ thuật viên, thanh toán trực tuyến trong vài bước.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/services"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-foreground px-5 text-sm font-semibold text-primary transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              <CalendarCheckIcon className="size-4" aria-hidden="true" />
              Đặt lịch ngay
            </Link>
            <a
              href={phoneHref}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-primary-foreground/40 px-5 text-sm font-semibold transition-colors outline-none hover:bg-primary-foreground/10 focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
            >
              <PhoneIcon className="size-4" aria-hidden="true" />
              Gọi {siteInfo.phone}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr_1.5fr]">
          <div className="col-span-2 space-y-4 lg:col-span-1">
            <p className="font-heading text-2xl">{siteInfo.name}</p>
            <p className="text-sm text-primary-foreground/75 italic">{siteInfo.tagline}</p>
            <ul className="flex gap-2.5 pt-1" aria-label="Mạng xã hội">
              {siteInfo.socials.map((social) => {
                const { icon: Icon, size } = socialIcons[social.label];
                return (
                  <li key={social.label}>
                    {social.href ? (
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={social.label}
                        className={cn(
                          socialClass,
                          'outline-none hover:bg-primary-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-primary-foreground/60',
                        )}
                      >
                        <Icon className={size} aria-hidden="true" />
                      </a>
                    ) : (
                      // No page yet (siteInfo DEMO): the icon shows the channel without a dead link.
                      <span
                        title={`${social.label} (sắp có)`}
                        className={cn(socialClass, 'opacity-80')}
                      >
                        <Icon className={size} aria-hidden="true" />
                        <span className="sr-only">{social.label} (sắp có)</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <FooterLinks title="Khám phá" links={quickLinks} />

          <div className="space-y-6">
            <FooterLinks title="Tài khoản" links={accountLinks} />
            <div className="space-y-3">
              <p className={heading}>Hỗ trợ</p>
              <ul className="space-y-2 text-sm text-primary-foreground/75">
                {supportItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <address className="col-span-2 space-y-4 not-italic lg:col-span-1">
            <p className={heading}>Liên hệ</p>
            <ul className="space-y-3 text-sm text-primary-foreground/75">
              <ContactRow icon={MapPinIcon}>{siteInfo.address}</ContactRow>
              <ContactRow icon={PhoneIcon}>
                <a href={phoneHref} className={linkClass}>
                  {siteInfo.phone}
                </a>
              </ContactRow>
              <ContactRow icon={MailIcon}>
                <a href={`mailto:${siteInfo.email}`} className={cn(linkClass, 'break-all')}>
                  {siteInfo.email}
                </a>
              </ContactRow>
              <ContactRow icon={Clock4Icon}>{siteInfo.openingHours}</ContactRow>
            </ul>
          </address>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-5 text-xs text-primary-foreground/70 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p className="text-center sm:text-left">
            © 2026 {siteInfo.name}. Đồ án tốt nghiệp, nền tảng đang được phát triển.
          </p>
          <p className="flex items-center gap-2">
            Thanh toán trực tuyến qua
            {/* The image is a square with the wordmark in a band across the middle: show only that band. */}
            <span className="inline-flex h-8 w-24 items-center justify-center overflow-hidden rounded-md bg-card">
              <img src={vnpayIcon} alt="VNPay" className="w-24 max-w-none shrink-0" />
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: readonly { to: string; label: string }[];
}) {
  return (
    <nav aria-label={title} className="space-y-3">
      <p className={heading}>{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={cn(linkClass, 'group inline-flex items-center gap-1')}>
              {link.label}
              <ArrowRightIcon
                className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ContactRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-foreground/10">
        <Icon className="size-4 text-primary-foreground" aria-hidden="true" />
      </span>
      <span className="pt-1.5">{children}</span>
    </li>
  );
}
