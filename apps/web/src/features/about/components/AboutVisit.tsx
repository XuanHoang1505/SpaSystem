import { ClockIcon, MailIcon, MapPinIcon, NavigationIcon, PhoneIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { siteInfo } from '@/config/siteInfo';
import { HomeContainer } from '@/features/home';

const destination = encodeURIComponent(siteInfo.address);
const mapEmbedUrl = `https://www.google.com/maps?q=${destination}&z=16&output=embed`;
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
const phoneHref = `tel:${siteInfo.phone.replace(/\s+/g, '')}`;

function Detail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 py-5 first:pt-0">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div className="space-y-1">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="font-medium text-foreground">{children}</dd>
      </div>
    </div>
  );
}

/** Address, phone, email and opening hours (SCR-W06) beside an embedded map, with call and directions actions. */
export function AboutVisit() {
  return (
    <section id="lien-he" aria-labelledby="about-visit" className="scroll-mt-24">
      <HomeContainer className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <div className="space-y-8">
          <div className="space-y-3">
            <h2
              id="about-visit"
              className="font-heading text-3xl leading-tight tracking-tight md:text-[2.75rem]"
            >
              Ghé thăm spa
            </h2>
            <p className="max-w-md text-muted-foreground">
              Đặt lịch trước để spa chuẩn bị phòng và kỹ thuật viên cho bạn, hoặc gọi cho chúng tôi
              nếu cần tư vấn.
            </p>
          </div>
          <dl className="divide-y">
            <Detail icon={<MapPinIcon aria-hidden="true" className="size-5" />} label="Địa chỉ">
              {siteInfo.address}
            </Detail>
            <Detail icon={<PhoneIcon aria-hidden="true" className="size-5" />} label="Điện thoại">
              <a href={phoneHref} className="hover:text-primary hover:underline">
                {siteInfo.phone}
              </a>
            </Detail>
            <Detail icon={<MailIcon aria-hidden="true" className="size-5" />} label="Email">
              <a
                href={`mailto:${siteInfo.email}`}
                className="break-all hover:text-primary hover:underline"
              >
                {siteInfo.email}
              </a>
            </Detail>
            <Detail icon={<ClockIcon aria-hidden="true" className="size-5" />} label="Giờ mở cửa">
              {siteInfo.openingHours}
            </Detail>
          </dl>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={phoneHref}>
                <PhoneIcon aria-hidden="true" /> Liên hệ ngay
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={directionsUrl} target="_blank" rel="noreferrer">
                <NavigationIcon aria-hidden="true" /> Chỉ đường
              </a>
            </Button>
          </div>
        </div>
        <div className="h-80 overflow-hidden rounded-sm border bg-muted lg:h-auto lg:min-h-[460px]">
          <iframe
            title={`Bản đồ đường tới ${siteInfo.name}`}
            src={mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full border-0"
          />
        </div>
      </HomeContainer>
    </section>
  );
}
