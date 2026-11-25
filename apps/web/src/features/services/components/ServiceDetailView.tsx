import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BotIcon,
  CalendarCheckIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  DoorOpenIcon,
  FileTextIcon,
  FlowerIcon,
  ListChecksIcon,
  SparklesIcon,
  StarIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceDetail } from '@spa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency, formatDuration } from '@/lib/formatting/formatters';
import { placeholderServiceSpace } from '../catalogPlaceholders';
import { catalogPolicies } from '../catalogPolicies';
import { catalogStatusBadge } from '../catalogStatus';
import { useService } from '../hooks/useService';
import { CareSteps } from './CareSteps';
import { CatalogBreadcrumb } from './CatalogBreadcrumb';
import { CatalogDetailStates } from './CatalogDetailStates';
import { CatalogFaq } from './CatalogFaq';
import { CatalogTrustStrip } from './CatalogTrustStrip';
import { BookServiceButton } from '@/features/bookings/components/BookServiceButton';
import { AddToCartButton } from '@/features/orders';
import { RelatedServices } from './RelatedServices';

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Ẩn dòng mô tả ngắn nếu chỉ lặp lại tên dịch vụ. */
function addsToName(name: string, text: string | null) {
  if (!text) return false;
  return !normalizeText(name).includes(normalizeText(text));
}

/** Kiểm tra mô tả chi tiết có khác với mô tả ngắn hay không để tránh in lặp 2 câu giống hệt nhau. */
function isDistinctDescription(shortDescription: string | null, description: string | null) {
  if (!description) return false;
  if (!shortDescription) return true;
  return normalizeText(shortDescription) !== normalizeText(description);
}

const experienceSteps = [
  {
    icon: CalendarPlusIcon,
    title: 'Đặt lịch hoặc mua trước',
    description:
      'Chọn ngay khung giờ trống để giữ chỗ, hoặc thêm vào giỏ mua trước và đặt lịch bất cứ khi nào thuận tiện.',
  },
  {
    icon: SparklesIcon,
    title: 'Chuẩn bị không gian riêng',
    description:
      'Đến spa trước giờ hẹn 5–10 phút để kỹ thuật viên lắng nghe nhu cầu và chuẩn bị phòng, bộ khăn dụng cụ riêng.',
  },
  {
    icon: CalendarCheckIcon,
    title: 'Thư giãn & cảm nhận',
    description:
      'Tận hưởng buổi chăm sóc trọn thời lượng, thưởng thức trà thảo mộc và chia sẻ đánh giá trên tài khoản của bạn.',
  },
] as const;

/**
 * SCR-W03 — Chi tiết dịch vụ (UC-SPA-07). Bố cục 2 cột hiện đại đồng bộ với trang chi tiết gói:
 * cột trái là luồng nội dung chi tiết (Ảnh Hero, Tổng quan & Mô tả, Quy trình Timeline, Hướng dẫn trải nghiệm),
 * cột phải là hộp Giá + Đặt lịch + Giờ trống cố định (sticky) khi cuộn.
 */
export function ServiceDetailView({
  serviceId,
  aside,
  sections,
}: {
  serviceId: string;
  /** Hiện dưới khung giá ở cột phải sticky, khi dịch vụ đã tải. */
  aside?: (service: ServiceDetail) => ReactNode;
  /** Hiện sau vùng 2 cột, trước "Dịch vụ cùng loại". */
  sections?: (service: ServiceDetail) => ReactNode;
}) {
  const query = useService(serviceId);
  const service = query.data;
  useDocumentTitle(service?.name);

  return (
    <CatalogDetailStates
      query={query}
      notFoundTitle="Không tìm thấy dịch vụ"
      notFoundDescription="Dịch vụ không tồn tại hoặc đã ngừng bán."
      backTo="/services"
      backLabel="Xem tất cả dịch vụ"
    >
      {service && (
        <article className="space-y-12">
          <div className="-mx-4 -mt-8 border-b bg-muted/60 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <CatalogBreadcrumb parentLabel="Dịch vụ" parentTo="/services" current={service.name} />
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10">
            <div className="space-y-8">
              <div className="relative overflow-hidden rounded-3xl border bg-muted/30 shadow-xs">
                <ImageWithFallback
                  src={service.imageUrl}
                  alt={service.name}
                  fallbackIcon={SparklesIcon}
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                  <Link
                    to={`/services?categoryId=${service.categoryId}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-background"
                  >
                    <FlowerIcon className="size-3.5 text-primary" aria-hidden="true" />
                    <span>{service.category}</span>
                  </Link>
                </div>
                <div className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-full bg-primary/95 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-md backdrop-blur-xs">
                  <ClockIcon className="size-3.5" aria-hidden="true" />
                  <span>{formatDuration(service.durationMinutes)}</span>
                </div>
              </div>

              <Card className="gap-0 rounded-2xl py-0">
                <CardContent className="space-y-6 p-6 sm:p-7">
                  <header className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/services?categoryId=${service.categoryId}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                      >
                        <FlowerIcon className="size-3.5 text-primary" aria-hidden="true" />
                        {service.category}
                      </Link>
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        Dịch vụ đơn lẻ
                      </Badge>
                      {service.status === 'discontinued' && (
                        <StatusBadge {...catalogStatusBadge.discontinued} status={service.status} />
                      )}
                    </div>

                    <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {service.name}
                    </h1>

                    <ServiceRatingSummary
                      averageRating={service.averageRating}
                      reviewCount={service.reviewCount}
                    />

                    {addsToName(service.name, service.shortDescription) && (
                      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                        {service.shortDescription}
                      </p>
                    )}
                  </header>

                  <dl className="grid grid-cols-3 divide-x rounded-xl bg-muted/50 py-4">
                    <ServiceFact
                      icon={ClockIcon}
                      value={formatDuration(service.durationMinutes)}
                      label="thời lượng buổi"
                    />
                    <ServiceFact
                      icon={ListChecksIcon}
                      value={
                        service.steps.length > 0 ? `${service.steps.length} bước` : 'Chuẩn spa'
                      }
                      label="quy trình chăm sóc"
                    />
                    <ServiceFact
                      icon={DoorOpenIcon}
                      value={placeholderServiceSpace}
                      label="không gian phục vụ"
                    />
                  </dl>

                  <section className="space-y-2.5 border-t pt-6">
                    <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-foreground">
                      <FileTextIcon className="size-5 text-primary" aria-hidden="true" />
                      Giới thiệu dịch vụ
                    </h2>
                    <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
                      {isDistinctDescription(service.shortDescription, service.description)
                        ? service.description
                        : service.description
                          ? `${service.description}\n\nLiệu trình thuộc nhóm "${service.category}", được thiết kế trọn gói trong ${formatDuration(service.durationMinutes)} tại không gian phòng riêng yên tĩnh của Như Nguyệt Spa, sử dụng mỹ phẩm và thảo mộc lành tính cùng bộ khăn, dụng cụ chuẩn bị riêng cho từng khách hàng.`
                          : 'Chưa có mô tả cho dịch vụ này.'}
                    </p>
                  </section>
                </CardContent>
              </Card>

              <CareSteps steps={service.steps} totalMinutes={service.durationMinutes} />

              <Card className="rounded-2xl py-0">
                <CardContent className="space-y-6 p-6 sm:p-7">
                  <div className="space-y-1">
                    <h2
                      id="service-experience-steps"
                      className="font-heading text-xl font-semibold text-foreground"
                    >
                      Hướng dẫn đặt lịch & trải nghiệm
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Ba bước đơn giản để tận hưởng buổi chăm sóc trọn vẹn tại Như Nguyệt Spa.
                    </p>
                  </div>
                  <ol
                    aria-labelledby="service-experience-steps"
                    className="grid gap-6 sm:grid-cols-3 sm:gap-5"
                  >
                    {experienceSteps.map((step, index) => (
                      <li key={step.title} className="flex gap-3 sm:flex-col">
                        <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <step.icon className="size-5" aria-hidden="true" />
                          <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                            {index + 1}
                          </span>
                        </span>
                        <div className="space-y-1">
                          <p className="font-heading font-semibold text-foreground">{step.title}</p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>

            <aside aria-label="Giá và đặt lịch dịch vụ" className="space-y-6 lg:sticky lg:top-28">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="border-b bg-muted/40 p-5 sm:p-6">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Giá niêm yết trọn gói
                  </p>
                  <p className="mt-1 font-heading text-3xl font-bold text-primary sm:text-4xl">
                    <span>{formatCurrency(service.price)}</span>
                    <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">
                      / buổi ({formatDuration(service.durationMinutes)})
                    </span>
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    <SparklesIcon className="size-3 text-primary" aria-hidden="true" />
                    <span>Đã bao gồm mỹ phẩm, dụng cụ riêng & trà thảo mộc</span>
                  </div>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Quyền lợi đặt lịch
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <CheckCircle2Icon
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span>Chọn ngày, khung giờ và kỹ thuật viên theo lịch thực tế</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <CheckCircle2Icon
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span>Có thể mua trước qua giỏ hàng và đặt lịch sử dụng sau</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <CheckCircle2Icon
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span>
                          Đổi hoặc hủy lịch hẹn miễn phí trước{' '}
                          {catalogPolicies.customerChangeCutoffHours} giờ
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="grid gap-2.5 pt-1">
                    <BookServiceButton serviceId={service.id} size="lg" className="w-full">
                      <CalendarPlusIcon aria-hidden="true" />
                      Đặt lịch ngay
                    </BookServiceButton>
                    <AddToCartButton
                      product={{ type: 'service', id: service.id }}
                      productName={service.name}
                      className="w-full"
                    />
                    <Button asChild size="lg" variant="secondary" className="w-full">
                      <Link to="/ai-assistant">
                        <BotIcon aria-hidden="true" />
                        Hỏi trợ lý tư vấn
                      </Link>
                    </Button>
                  </div>

                  <div className="space-y-2 border-t pt-4 text-[11px] text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CreditCardIcon className="size-3.5 text-primary" aria-hidden="true" />
                      Thanh toán an toàn qua cổng VNPay
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarCheckIcon className="size-3.5 text-primary" aria-hidden="true" />
                      Giữ chỗ ngay trong {catalogPolicies.paymentTimeoutMinutes} phút chờ thanh toán
                    </p>
                  </div>
                </div>
              </div>

              {aside?.(service)}
            </aside>
          </div>

          {sections?.(service)}
          <RelatedServices categoryId={service.categoryId} excludeId={service.id} />
          <CatalogFaq kind="service" />
          <CatalogTrustStrip />
        </article>
      )}
    </CatalogDetailStates>
  );
}

/** Hiển thị điểm đánh giá thật từ API (hoặc trạng thái chưa có đánh giá) và cuộn xuống mục #danh-gia. */
function ServiceRatingSummary({
  averageRating,
  reviewCount,
}: {
  averageRating: number | null;
  reviewCount: number;
}) {
  if (reviewCount > 0 && averageRating !== null) {
    return (
      <a
        href="#danh-gia"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <StarIcon className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
        <span className="font-semibold text-foreground">{averageRating.toFixed(1)}</span>
        <span>({reviewCount} đánh giá từ khách hàng)</span>
      </a>
    );
  }
  return (
    <a
      href="#danh-gia"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <StarIcon className="size-4 text-amber-400" aria-hidden="true" />
      <span>Chưa có đánh giá · Xem mục đánh giá</span>
    </a>
  );
}

/** Một ô thông số tóm tắt dịch vụ (thời lượng, số bước, không gian). */
function ServiceFact({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-2 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-2xs">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col-reverse">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-heading text-lg leading-tight font-semibold text-foreground sm:text-xl">
          {value}
        </dd>
      </div>
    </div>
  );
}
