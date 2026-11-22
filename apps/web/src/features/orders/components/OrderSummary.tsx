import { HourglassIcon, PackageCheckIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppliedPromotion, CatalogItemType } from '@spa/shared-types';
import momoLogo from '@/assets/images/momo_icon.png';
import visaLogo from '@/assets/images/visa.png';
import vnpayLogo from '@/assets/images/vnpay_icon.png';
import zalopayLogo from '@/assets/images/zalopay_icon.png';
import { Badge } from '@/components/ui/badge';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatting/formatters';
import { usePackage } from '@/features/service-packages/hooks/usePackage';
import { useService } from '@/features/services/hooks/useService';
import { CheckoutSection } from './CheckoutSection';

export interface SummaryLine {
  key: string;
  type: CatalogItemType;
  /** The catalog id; when set, the row shows the product's photo and what it includes. */
  productId?: string;
  name: string;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

/** "Sản phẩm": the lines of a preview or an order. `step` numbers the block on the checkout. */
export function OrderLines({ lines, step }: { lines: readonly SummaryLine[]; step?: number }) {
  return (
    <CheckoutSection
      step={step}
      title="Sản phẩm"
      aside={
        <Badge variant="secondary" className="shrink-0 font-semibold text-primary">
          {lines.length} mục
        </Badge>
      }
    >
      <ul className="divide-y divide-border/60">
        {lines.map((line) => (
          <OrderLineRow key={line.key} line={line} />
        ))}
      </ul>
    </CheckoutSection>
  );
}

/** One line: photo, name, type and what it includes (sessions and validity, or duration), price. */
function OrderLineRow({ line }: { line: SummaryLine }) {
  const isPackage = line.type === 'package';
  const pkg = usePackage(line.productId ?? '', isPackage && Boolean(line.productId));
  const service = useService(line.productId ?? '', !isPackage && Boolean(line.productId));
  const imageUrl = (isPackage ? pkg.data?.imageUrl : service.data?.imageUrl) ?? null;
  const facts = isPackage
    ? pkg.data && [`${pkg.data.totalSessions} buổi`, `Dùng trong ${pkg.data.validityDays} ngày`]
    : service.data && [`${service.data.durationMinutes} phút`];
  return (
    <li className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      {line.productId && (
        <ImageWithFallback
          src={imageUrl}
          alt=""
          fallbackIcon={isPackage ? PackageCheckIcon : SparklesIcon}
          className="size-16 shrink-0 rounded-xl object-cover"
        />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-heading text-base font-semibold text-foreground sm:text-lg">
          {line.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs font-medium">
            {isPackage ? 'Gói liệu trình' : 'Dịch vụ lẻ'}
          </Badge>
          {facts && <span>{facts.join(' · ')}</span>}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-heading text-base font-bold text-primary sm:text-lg">
          {formatCurrency(line.lineTotal)}
        </p>
        {line.discountAmount > 0 && (
          <p className="text-xs text-muted-foreground line-through">
            {formatCurrency(line.unitPrice)}
          </p>
        )}
      </div>
    </li>
  );
}

/** Subtotal, discount and the grand total. */
export function OrderTotals({
  subtotal,
  discountTotal,
  grandTotal,
  promotion,
}: {
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  promotion: AppliedPromotion | null;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Tạm tính</dt>
        <dd>{formatCurrency(subtotal)}</dd>
      </div>
      {discountTotal > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            {promotion ? `Giảm giá (${promotion.code})` : 'Giảm giá'}
          </dt>
          <dd>−{formatCurrency(discountTotal)}</dd>
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-3">
        <dt className="shrink-0 font-heading text-lg">Tổng thanh toán</dt>
        <dd className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
          {formatCurrency(grandTotal)}
        </dd>
      </div>
    </dl>
  );
}

interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  /** How the logo sits in the square tile: the files differ (full-bleed square, wide with margins, tight). */
  logoClass: string;
  description: string;
  chips: readonly string[];
  available: boolean;
}

/** Only VNPay is wired to the API (`IPaymentGateway`); the rest are shown disabled until a gateway exists. */
const paymentMethods: readonly PaymentMethod[] = [
  {
    id: 'vnpay',
    name: 'Cổng thanh toán VNPay',
    logo: vnpayLogo,
    logoClass: 'scale-110 object-contain',
    description: 'Thanh toán bằng mã QR hoặc thẻ ngân hàng ngay trên trang của VNPay.',
    chips: ['VNPAY-QR', 'Thẻ ATM nội địa'],
    available: true,
  },
  {
    id: 'momo',
    name: 'Ví MoMo',
    logo: momoLogo,
    logoClass: 'object-cover',
    description: 'Thanh toán nhanh bằng ví điện tử MoMo.',
    chips: [],
    available: false,
  },
  {
    id: 'zalopay',
    name: 'Ví ZaloPay',
    logo: zalopayLogo,
    logoClass: 'object-contain p-2',
    description: 'Thanh toán bằng ví ZaloPay.',
    chips: [],
    available: false,
  },
  {
    id: 'card',
    name: 'Thẻ quốc tế',
    logo: visaLogo,
    logoClass: 'object-contain p-1',
    description: 'Thẻ Visa, Mastercard hoặc JCB.',
    chips: ['VISA', 'Mastercard', 'JCB'],
    available: false,
  },
];

function PaymentMethodOption({ method }: { method: PaymentMethod }) {
  return (
    <div
      role="radio"
      aria-checked={method.available}
      aria-disabled={method.available ? undefined : true}
      tabIndex={method.available ? 0 : -1}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        method.available ? 'border-2 border-primary bg-accent/40' : 'bg-muted/30 opacity-70',
      )}
    >
      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
        <img src={method.logo} alt="" className={cn('size-full', method.logoClass)} />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {method.name}
          {method.available ? (
            <Badge variant="secondary">Khuyên dùng</Badge>
          ) : (
            <Badge variant="outline">Sắp có</Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{method.description}</p>
        {method.chips.length > 0 && (
          <p className="flex flex-wrap gap-1.5 pt-1">
            {method.chips.map((chip) => (
              <span
                key={chip}
                className="rounded border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </p>
        )}
        {method.available && (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
            Không lưu thông tin thẻ của bạn trên hệ thống.
          </p>
        )}
      </div>
    </div>
  );
}

/** "Phương thức thanh toán" (UC-SPA-11): VNPay is the only method that works today. */
export function PaymentMethodCard({ step }: { step?: number }) {
  return (
    <CheckoutSection
      step={step}
      title="Phương thức thanh toán"
      description="Giao dịch được mã hóa và xử lý an toàn qua cổng thanh toán."
    >
      <div role="radiogroup" aria-label="Phương thức thanh toán" className="space-y-3">
        {paymentMethods.map((method) => (
          <PaymentMethodOption key={method.id} method={method} />
        ))}
      </div>
    </CheckoutSection>
  );
}

/** Warm ambient box at the top of the summary: how long the order is held. */
export function HoldNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-3.5 text-xs font-medium text-amber-950 shadow-2xs">
      <HourglassIcon
        className="mt-0.5 size-4.5 shrink-0 animate-pulse text-amber-600"
        aria-hidden="true"
      />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
