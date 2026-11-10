import {
  ArrowRightIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  ClockIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PurchasedPackage } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { bookingPath } from '@/features/bookings/bookingParams';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { daysLeft } from '../filter';
import { packageStatusBadge } from '../purchaseStatus';

const closedReason: Partial<Record<PurchasedPackage['status'], string>> = {
  expired: 'Gói đã hết hạn',
  completed: 'Gói đã hoàn thành',
  cancelled: 'Gói đã hủy',
};

/** Why the next session cannot be booked (null when nothing needs saying). */
function blockedReason(item: PurchasedPackage): string | null {
  const closed = closedReason[item.status];
  if (closed) return closed;
  if (item.treatmentPlan.status === 'paused') return 'Liệu trình đang tạm dừng';
  if (item.treatmentPlan.status === 'cancelled') return 'Liệu trình đã hủy';
  if (item.nextSession && !item.nextSession.canBook) return 'Buổi tiếp theo chưa thể đặt lịch';
  return null;
}

export function PackageCard({
  item,
  onViewOrder,
}: {
  item: PurchasedPackage;
  onViewOrder: (order: { id: string; code: string }) => void;
}) {
  const badge = packageStatusBadge(item.status);
  const left = item.totalSessions - item.usedSessions;
  const days = item.status === 'active' ? daysLeft(item.expiresAtUtc) : null;
  const next = item.nextSession;
  const canBookNext = item.status === 'active' && next !== null && next.canBook;
  const reason = canBookNext ? null : blockedReason(item);
  const percent =
    item.totalSessions > 0 ? Math.min(100, (item.usedSessions / item.totalSessions) * 100) : 0;

  return (
    <article className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              Gói dịch vụ
            </span>
            <button
              type="button"
              onClick={() => onViewOrder(item.order)}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              {`Đơn ${item.order.code}`}
            </button>
          </div>
          <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {item.packageName}
          </h3>
        </div>
        <StatusBadge label={badge.label} tone={badge.tone} status={item.status} />
      </div>

      <div className="space-y-2.5 rounded-xl bg-muted/30 p-4 border">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <CircleCheckIcon className="size-4 text-primary" aria-hidden="true" />
            {`${item.usedSessions}/${item.totalSessions} buổi đã thực hiện`}
          </span>
          <span className="text-xs font-semibold text-primary">{`Còn ${left} buổi`}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Tiến độ liệu trình"
          aria-valuemin={0}
          aria-valuemax={item.totalSessions}
          aria-valuenow={item.usedSessions}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-0.5">
          {item.bookedSessions > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              {`${item.bookedSessions} buổi đã đặt lịch`}
            </span>
          ) : (
            <span />
          )}
          {item.expiresAtUtc ? (
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-3.5" aria-hidden="true" />
              <span>{`Hạn đến ${formatLocalDate(vietnamDateOf(item.expiresAtUtc))}`}</span>
              {days !== null && (
                <span className="font-medium text-foreground">{`Còn ${days} ngày`}</span>
              )}
            </div>
          ) : (
            <span>Không giới hạn thời gian</span>
          )}
        </div>
      </div>

      {item.status === 'active' && next && (
        <div className="flex items-center gap-2 rounded-xl border border-secondary bg-secondary/30 p-3 text-xs text-foreground/90">
          <CalendarClockIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="leading-snug">
            {`Buổi ${next.sequenceNumber} kế tiếp: ${next.serviceName}, sớm nhất từ ${formatLocalDate(next.earliestDate)}`}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {canBookNext && (
          <Button asChild className="shadow-xs font-medium">
            <Link
              to={bookingPath({
                kind: 'session',
                treatmentSessionId: next.id,
                treatmentPlanId: item.treatmentPlan.id,
              })}
            >
              <CalendarPlusIcon aria-hidden="true" />
              Đặt lịch buổi tiếp theo
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="font-medium">
          <Link to={`/my-packages/${item.id}`}>
            Xem chi tiết gói
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="ghost" className="font-medium text-xs text-primary hover:text-primary">
          <Link to={`/my-treatment-plans/${item.treatmentPlan.id}`}>
            Xem phác đồ điều trị →
          </Link>
        </Button>
        {reason && <span className="text-xs text-muted-foreground">{reason}</span>}
      </div>
    </article>
  );
}
