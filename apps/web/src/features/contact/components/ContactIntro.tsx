import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  NavigationIcon,
  ReceiptTextIcon,
  SparklesIcon,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { siteInfo } from '@/config/siteInfo';
import { ContactChannels } from './ContactChannels';
import { ContactMessageForm } from './ContactMessageForm';

const destination = encodeURIComponent(siteInfo.address);
const mapEmbedUrl = `https://www.google.com/maps?q=${destination}&z=16&output=embed`;
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

/** Things a visitor can already do alone, so they do not need to wait for a reply. Each matches a real feature. */
const selfService = [
  {
    icon: SparklesIcon,
    title: 'Đặt lịch hẹn trực tuyến',
    text: 'Chọn dịch vụ, khung giờ trống thực tế và kỹ thuật viên yêu thích chỉ trong vài bước.',
    to: '/services',
  },
  {
    icon: CalendarCheckIcon,
    title: 'Đổi hoặc hủy lịch hẹn',
    text: 'Chủ động đổi giờ hoặc hủy lịch miễn phí trong "Lịch hẹn của tôi" trước giờ hẹn 24 giờ.',
    to: '/my-bookings',
  },
  {
    icon: ReceiptTextIcon,
    title: 'Tra cứu đơn hàng & thanh toán',
    text: 'Xem trạng thái đơn, lịch sử thanh toán VNPay và các gói dịch vụ đã mua.',
    to: '/my-orders',
  },
] as const;

/** The contact page's opening: centered header with left breadcrumb, 4 channels, then message form beside map & self-service. */
export function ContactIntro() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center space-y-2.5 border-b pb-6 text-center">
        <Breadcrumb aria-label="Vị trí trang" className="self-start">
          <BreadcrumbList className="text-xs">
            {[{ label: 'Trang chủ', to: '/' }, { label: 'Liên hệ' }].map((step, index) => (
              <Fragment key={step.label}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {'to' in step && step.to ? (
                    <BreadcrumbLink asChild>
                      <Link to={step.to}>{step.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{step.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          Kết nối & Hỗ trợ
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          Liên hệ với {siteInfo.name}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Gọi điện, gửi lời nhắn hoặc ghé trực tiếp spa. Chọn cách thuận tiện nhất với bạn, chúng
          tôi luôn sẵn lòng lắng nghe.
        </p>
      </header>

      <ContactChannels />

      <section
        aria-labelledby="contact-message"
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8"
      >
        <div className="rounded-2xl border bg-card p-5 shadow-xs sm:p-7">
          <div className="mb-6 flex items-start gap-3.5 border-b pb-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <MailIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h2
                id="contact-message"
                className="font-heading text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Gửi lời nhắn cho spa
              </h2>
              <p className="text-sm text-muted-foreground">
                Để lại câu hỏi, yêu cầu tư vấn hoặc góp ý. Spa sẽ phản hồi qua email hoặc số điện
                thoại của bạn.
              </p>
            </div>
          </div>
          <ContactMessageForm />
        </div>

        <aside aria-label="Bản đồ và tiện ích tự phục vụ" className="space-y-5">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
            <div className="h-52 w-full border-b bg-muted sm:h-56">
              <iframe
                title={`Bản đồ đường tới ${siteInfo.name}`}
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="size-full border-0"
              />
            </div>
            <div className="space-y-3.5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 font-heading text-base font-semibold text-foreground">
                    <MapPinIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    {siteInfo.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{siteInfo.address}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <a href={directionsUrl} target="_blank" rel="noreferrer">
                    <NavigationIcon className="size-3.5" aria-hidden="true" />
                    Chỉ đường
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
                <ClockIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Giờ mở cửa: <strong className="text-foreground">{siteInfo.openingHours}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-xs">
            <div className="space-y-0.5">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Thao tác nhanh không cần chờ
              </h3>
              <p className="text-xs text-muted-foreground">
                Bạn có thể chủ động thực hiện ngay trên hệ thống trực tuyến:
              </p>
            </div>
            <ul className="space-y-2.5">
              {selfService.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title}>
                    <Link
                      to={item.to}
                      className="group flex items-start justify-between gap-3 rounded-xl border bg-background/60 p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <span className="space-y-0.5">
                          <span className="block text-sm font-medium text-foreground group-hover:text-primary">
                            {item.title}
                          </span>
                          <span className="block text-xs leading-relaxed text-muted-foreground">
                            {item.text}
                          </span>
                        </span>
                      </span>
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
