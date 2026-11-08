import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BotIcon,
  CalendarPlusIcon,
  ClockIcon,
  DoorOpenIcon,
  FileTextIcon,
  FlowerIcon,
  SparklesIcon,
  StarIcon,
} from 'lucide-react';
import type { ServiceDetail } from '@spa/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { DecorativeShapes } from '@/components/shared/DecorativeShapes/DecorativeShapes';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { InfoTile } from '@/components/shared/InfoTile/InfoTile';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency, formatDuration } from '@/lib/formatting/formatters';
import { formatRating, placeholderRating, placeholderServiceSpace } from '../catalogPlaceholders';
import { catalogStatusBadge } from '../catalogStatus';
import { useService } from '../hooks/useService';
import { CareSteps } from './CareSteps';
import { CatalogBreadcrumb } from './CatalogBreadcrumb';
import { CatalogDetailStates } from './CatalogDetailStates';
import { CatalogFaq } from './CatalogFaq';
import { CatalogTrustStrip } from './CatalogTrustStrip';
import { ComingSoonButton } from './ComingSoonButton';
import { RelatedServices } from './RelatedServices';

/**
 * SCR-W03 — Chi tiết dịch vụ (UC-SPA-07), theo mẫu Stitch chi tiết. ★, "Không gian" và các nút
 * đặt lịch/hỏi AI là nội dung tạm (catalogPlaceholders, ComingSoonButton). Phần của tính năng khác
 * (giờ trống, kỹ thuật viên, gói chứa dịch vụ) do trang truyền vào qua `aside`/`sections`, để
 * `features/services` không phụ thuộc ngược các feature đó.
 */
export function ServiceDetailView({
  serviceId,
  aside,
  sections,
}: {
  serviceId: string;
  /** Hiện dưới khung giá, khi dịch vụ đã tải. */
  aside?: (service: ServiceDetail) => ReactNode;
  /** Hiện sau quy trình chăm sóc, trước "Dịch vụ cùng loại". */
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

          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="relative">
              <DecorativeShapes />
              <ImageWithFallback
                src={service.imageUrl}
                alt={service.name}
                fallbackIcon={SparklesIcon}
                className="relative aspect-[4/3] w-full rounded-2xl border"
              />
            </div>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/services?categoryId=${service.categoryId}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  <FlowerIcon className="size-3.5" aria-hidden="true" />
                  {service.category}
                </Link>
                {service.status === 'discontinued' && (
                  <StatusBadge {...catalogStatusBadge.discontinued} status={service.status} />
                )}
              </div>
              <h1 className="text-3xl tracking-tight text-primary sm:text-5xl">{service.name}</h1>
              <ServiceRating id={service.id} />
              {service.shortDescription && (
                <p className="text-lg text-muted-foreground">{service.shortDescription}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile
                  icon={ClockIcon}
                  label="Thời lượng"
                  value={formatDuration(service.durationMinutes)}
                />
                <InfoTile icon={DoorOpenIcon} label="Không gian" value={placeholderServiceSpace} />
              </div>
              <div className="space-y-4 rounded-xl border bg-card p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Giá niêm yết</p>
                  <p className="font-heading text-3xl font-semibold text-primary">
                    <span>{formatCurrency(service.price)}</span>
                    <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">
                      / buổi
                    </span>
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ComingSoonButton feature="Đặt lịch trực tuyến" size="lg">
                    <CalendarPlusIcon aria-hidden="true" />
                    Đặt lịch ngay
                  </ComingSoonButton>
                  <ComingSoonButton
                    feature="Trợ lý tư vấn"
                    size="lg"
                    variant="outline"
                    className="bg-card"
                  >
                    <BotIcon aria-hidden="true" />
                    Hỏi trợ lý tư vấn
                  </ComingSoonButton>
                </div>
              </div>
              {aside?.(service)}
            </div>
          </div>

          <Card className="w-full">
            <CardContent className="space-y-3">
              <h2 className="flex items-center gap-2 text-2xl">
                <FileTextIcon className="size-5 text-primary" aria-hidden="true" />
                Mô tả
              </h2>
              <p className="whitespace-pre-line text-muted-foreground">
                {service.description ?? 'Chưa có mô tả cho dịch vụ này.'}
              </p>
            </CardContent>
          </Card>
          <CareSteps steps={service.steps} />
          {sections?.(service)}
          <RelatedServices categoryId={service.categoryId} excludeId={service.id} />
          <CatalogFaq kind="service" />
          <CatalogTrustStrip />
        </article>
      )}
    </CatalogDetailStates>
  );
}

/** ★ tạm (chờ UC-SPA-29). */
function ServiceRating({ id }: { id: string }) {
  const rating = placeholderRating(id);
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <StarIcon className="size-4 fill-current text-status-warning-foreground" aria-hidden="true" />
      <span className="font-semibold text-foreground">{formatRating(rating.score)}</span>
      <span>({rating.count} đánh giá)</span>
    </p>
  );
}
