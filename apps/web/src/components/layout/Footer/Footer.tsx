import { Link } from 'react-router-dom';
import { Clock4Icon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { siteInfo } from '@/config/siteInfo';

const quickLinks = [
  { to: '/services', label: 'Dịch vụ' },
  { to: '/packages', label: 'Gói liệu trình' },
  { to: '/ai-assistant', label: 'Trợ lý AI' },
  { to: '/my-bookings', label: 'Lịch hẹn của tôi' },
] as const;

/** Policies without a page yet are listed as plain text. */
const supportItems = [
  'Chính sách bảo mật',
  'Điều khoản sử dụng',
  'Hướng dẫn đặt lịch',
  'Câu hỏi thường gặp',
];

const heading = 'text-sm font-semibold tracking-wide text-primary-foreground';
const linkClass =
  'rounded-sm text-primary-foreground/80 outline-none transition-colors hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary-foreground/60';

/** Public footer: brand, quick links, support, contact details (siteInfo) and social links. */
export function Footer() {
  return (
    <footer className="mt-8 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1.4fr] lg:px-8">
        <div className="space-y-3">
          <p className="font-heading text-2xl">{siteInfo.name}</p>
          <p className="text-sm text-primary-foreground/80 italic">{siteInfo.tagline}</p>
          <ul className="flex flex-wrap gap-2 pt-2" aria-label="Mạng xã hội">
            {siteInfo.socials.map((social) => (
              <li key={social.label}>
                {social.href ? (
                  <a
                    href={social.href}
                    className={`${linkClass} rounded-sm border border-primary-foreground/30 px-3 py-1 text-xs`}
                  >
                    {social.label}
                  </a>
                ) : (
                  <span className="rounded-sm border border-primary-foreground/30 px-3 py-1 text-xs text-primary-foreground/80">
                    {social.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Liên kết nhanh" className="space-y-3">
          <p className={heading}>Liên kết nhanh</p>
          <ul className="space-y-2 text-sm">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <p className={heading}>Hỗ trợ khách hàng</p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            {supportItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <address className="space-y-3 not-italic">
          <p className={heading}>Liên hệ</p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li className="flex gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {siteInfo.address}
            </li>
            <li className="flex gap-2">
              <PhoneIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <a href={`tel:${siteInfo.phone.replace(/\s/g, '')}`} className={linkClass}>
                {siteInfo.phone}
              </a>
            </li>
            <li className="flex gap-2">
              <MailIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <a href={`mailto:${siteInfo.email}`} className={linkClass}>
                {siteInfo.email}
              </a>
            </li>
            <li className="flex gap-2">
              <Clock4Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {siteInfo.openingHours}
            </li>
          </ul>
        </address>
      </div>
      <div className="border-t border-primary-foreground/15">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-primary-foreground/70 sm:px-6 lg:px-8">
          © 2026 {siteInfo.name}. Đồ án tốt nghiệp, nền tảng đang được phát triển.
        </p>
      </div>
    </footer>
  );
}
