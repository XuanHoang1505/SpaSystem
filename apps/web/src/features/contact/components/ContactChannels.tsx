import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRightIcon, BotIcon, MailIcon, NavigationIcon, PhoneIcon } from 'lucide-react';
import { siteInfo } from '@/config/siteInfo';
import { cn } from '@/lib/utils';

interface Channel {
  icon: LucideIcon;
  badge: string;
  title: string;
  value: string;
  note: string;
  actionLabel: string;
  href: string;
  /** In-app route (Link) instead of an external or tel/mailto link. */
  internal?: boolean;
  external?: boolean;
}

const destination = encodeURIComponent(siteInfo.address);

const channels: readonly Channel[] = [
  {
    icon: PhoneIcon,
    badge: 'Nhanh nhất',
    title: 'Hotline lễ tân',
    value: siteInfo.phone,
    note: 'Hỗ trợ trực tiếp khi cần đặt lịch gấp, đổi giờ hẹn hoặc tư vấn trong ngày.',
    actionLabel: 'Gọi điện ngay',
    href: `tel:${siteInfo.phone.replace(/\s+/g, '')}`,
  },
  {
    icon: MailIcon,
    badge: 'Phản hồi 24h',
    title: 'Hộp thư điện tử',
    value: siteInfo.email,
    note: 'Phù hợp cho góp ý chất lượng dịch vụ, xuất hóa đơn hoặc câu hỏi chi tiết.',
    actionLabel: 'Soạn email',
    href: `mailto:${siteInfo.email}`,
  },
  {
    icon: NavigationIcon,
    badge: 'Tại Đà Nẵng',
    title: 'Ghé trực tiếp spa',
    value: siteInfo.address,
    note: `Mở cửa ${siteInfo.openingHours.toLowerCase()}. Có phòng chăm sóc riêng tư.`,
    actionLabel: 'Mở chỉ đường',
    href: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    external: true,
  },
  {
    icon: BotIcon,
    badge: 'Trực tuyến 24/7',
    title: 'Trợ lý ảo AI',
    value: 'Tư vấn tức thì',
    note: 'Gợi ý liệu trình, tra cứu bảng giá và khung giờ trống bất kỳ lúc nào.',
    actionLabel: 'Trò chuyện ngay',
    href: '/ai-assistant',
    internal: true,
  },
];

const cardClass =
  'group flex h-full flex-col justify-between gap-4 rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

function ChannelBody({ channel }: { channel: Channel }) {
  const Icon = channel.icon;
  return (
    <>
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
            {channel.badge}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {channel.title}
          </p>
          <p className="font-heading text-base font-semibold break-words text-foreground sm:text-lg">
            {channel.value}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{channel.note}</p>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs font-semibold text-primary">
        <span>{channel.actionLabel}</span>
        <ArrowUpRightIcon
          aria-hidden="true"
          className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
        />
      </div>
    </>
  );
}

/** The ways to reach the spa that really work today: phone, email, directions and the AI assistant. */
export function ContactChannels({ className }: { className?: string }) {
  return (
    <ul className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {channels.map((channel) => (
        <li key={channel.title}>
          {channel.internal ? (
            <Link to={channel.href} className={cardClass}>
              <ChannelBody channel={channel} />
            </Link>
          ) : (
            <a
              href={channel.href}
              className={cardClass}
              {...(channel.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <ChannelBody channel={channel} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
