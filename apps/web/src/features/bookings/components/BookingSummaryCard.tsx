import {
  CalendarCheckIcon,
  CalendarDaysIcon,
  ClockIcon,
  LayersIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { OrderPreview } from '@spa/shared-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HoldNotice, OrderTotals } from '@/features/orders';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { formatCurrency, formatDuration } from '@/lib/formatting/formatters';
import { addMinutes, formatLongDate } from '@/lib/formatting/vietnamTime';
import type { ResolvedSource } from '../hooks/useBookingSource';

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="size-3.5 text-primary shrink-0" aria-hidden="true" />}
        <span>{label}</span>
      </dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** The sticky card of the booking page: what is being booked, the price rules of the flow and the confirm button. */
export function BookingSummaryCard({
  source,
  date,
  slot,
  staffName,
  flow,
  preview,
  promotion,
  error,
  submitting,
  disabled,
  onConfirm,
}: {
  source: ResolvedSource;
  date: string | null;
  slot: { startTime: string; staffMemberId?: string } | null;
  staffName?: string;
  flow: 'book_now' | 'entitlement';
  preview?: OrderPreview;
  promotion?: ReactNode;
  error?: string;
  submitting: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const entitlement = flow === 'entitlement';
  const ready = slot !== null && date !== null;
  const endTime = slot ? addMinutes(slot.startTime, source.durationMinutes) : null;
  const confirmLabel = entitlement ? 'Xác nhận đặt lịch' : 'Xác nhận và thanh toán';
  const total = preview?.grandTotal ?? source.price;

  return (
    <Card className="rounded-2xl shadow-xs lg:sticky lg:top-24">
      <CardContent className="space-y-4 p-5 sm:p-6">
        {!entitlement && (
          <HoldNotice>
            Chỗ được giữ {catalogPolicies.paymentTimeoutMinutes} phút để bạn thanh toán.
          </HoldNotice>
        )}
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {entitlement ? 'Chi tiết quyền sử dụng' : 'Thông tin lịch hẹn'}
        </h2>
        <dl className="space-y-2.5 text-sm">
          <Row icon={SparklesIcon} label="Dịch vụ">{source.name}</Row>
          {source.sequenceNumber !== undefined && (
            <Row icon={LayersIcon} label="Buổi">
              {source.totalSessions
                ? `Buổi ${source.sequenceNumber}/${source.totalSessions}`
                : `Buổi ${source.sequenceNumber}`}
            </Row>
          )}
          <Row icon={ClockIcon} label="Thời lượng">{formatDuration(source.durationMinutes)}</Row>
          <Row icon={CalendarDaysIcon} label="Ngày">{date ? formatLongDate(date) : 'Chưa chọn'}</Row>
          <Row icon={ClockIcon} label="Khung giờ">{slot ? `${slot.startTime} – ${endTime}` : 'Chưa chọn'}</Row>
          <Row icon={UserIcon} label="Kỹ thuật viên">{staffName ?? 'Hệ thống chọn giúp bạn'}</Row>
        </dl>

        {!entitlement && (
          <div className="space-y-4 border-t pt-3">
            {promotion}
            {preview ? (
              <OrderTotals
                subtotal={preview.subtotal}
                discountTotal={preview.discountTotal}
                grandTotal={preview.grandTotal}
                promotion={preview.promotion}
              />
            ) : (
              total !== undefined && (
                <p className="font-heading text-lg font-semibold text-primary">{`Tổng thanh toán: ${formatCurrency(total)}`}</p>
              )
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full font-semibold shadow-xs"
          disabled={!ready || disabled || submitting}
          loading={submitting}
          onClick={onConfirm}
        >
          <CalendarCheckIcon aria-hidden="true" />
          {confirmLabel}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Đổi hoặc hủy lịch trước giờ hẹn 24 giờ
        </p>

        <div className="space-y-2 border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>Cam kết giữ đúng chuyên viên & giờ hẹn</span>
          </div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>Phục vụ trà thảo mộc & phòng riêng thư giãn</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
