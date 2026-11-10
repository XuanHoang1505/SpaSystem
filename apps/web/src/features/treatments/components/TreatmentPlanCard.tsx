import {
  ArrowRightIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  ClockIcon,
  UserRoundIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyTreatmentListItem } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { packageStatusBadge } from '@/features/purchases/purchaseStatus';
import { daysLeft } from '@/features/purchases/filter';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { treatmentPlanStatusBadge } from '../treatmentStatus';

function blockedReason(plan: MyTreatmentListItem): string | null {
  if (plan.status === 'completed') return 'Liệu trình đã hoàn thành';
  if (plan.status === 'cancelled') return 'Liệu trình đã hủy';
  if (plan.status === 'paused') return 'Liệu trình đang tạm dừng';
  if (plan.packageStatus === 'expired') return 'Gói đã hết hạn';
  if (plan.nextSession && !plan.nextSession.canBook) return 'Buổi tiếp theo chưa thể đặt lịch';
  return null;
}

export function TreatmentPlanCard({ plan }: { plan: MyTreatmentListItem }) {
  const planBadge = treatmentPlanStatusBadge(plan.status);
  const pkgBadge = packageStatusBadge(plan.packageStatus);
  const left = plan.totalSessions - plan.usedSessions;
  const days = plan.packageStatus === 'active' ? daysLeft(plan.expiresAtUtc) : null;
  const next = plan.nextSession;
  const canBookNext =
    plan.status !== 'cancelled' &&
    plan.status !== 'paused' &&
    plan.packageStatus === 'active' &&
    next !== null &&
    next.canBook;
  const reason = canBookNext ? null : blockedReason(plan);
  const percent =
    plan.totalSessions > 0 ? Math.min(100, (plan.usedSessions / plan.totalSessions) * 100) : 0;

  return (
    <article className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0 space-y-1">
          <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {plan.packageName}
          </h3>
          {plan.primaryStaff && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRoundIcon className="size-3.5 text-primary" aria-hidden="true" />
              <span>{`Chuyên viên phụ trách: ${plan.primaryStaff.fullName}`}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={planBadge.label} tone={planBadge.tone} status={plan.status} />
          {plan.packageStatus !== 'active' && (
            <StatusBadge label={pkgBadge.label} tone={pkgBadge.tone} status={plan.packageStatus} />
          )}
        </div>
      </div>

      <div className="space-y-2.5 rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <CircleCheckIcon className="size-4 text-primary" aria-hidden="true" />
            {`${plan.usedSessions}/${plan.totalSessions} buổi đã thực hiện`}
          </span>
          <span className="text-xs font-semibold text-primary">{`Còn ${left} buổi`}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Tiến độ liệu trình"
          aria-valuemin={0}
          aria-valuemax={plan.totalSessions}
          aria-valuenow={plan.usedSessions}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
          {plan.bookedSessions > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              {`${plan.bookedSessions} buổi đã đặt lịch`}
            </span>
          ) : (
            <span />
          )}
          {plan.expiresAtUtc ? (
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-3.5" aria-hidden="true" />
              <span>{`Hạn đến ${formatLocalDate(vietnamDateOf(plan.expiresAtUtc))}`}</span>
              {days !== null && (
                <span className="font-medium text-foreground">{`Còn ${days} ngày`}</span>
              )}
            </div>
          ) : (
            <span>Không giới hạn thời gian</span>
          )}
        </div>
      </div>

      {next && (
        <div className="flex items-center gap-2 rounded-xl border border-secondary bg-secondary/30 p-3 text-xs text-foreground/90">
          <CalendarClockIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="leading-snug">
            {`Buổi ${next.sequenceNumber} kế tiếp: ${next.serviceName}${
              next.earliestDate ? `, sớm nhất từ ${formatLocalDate(next.earliestDate)}` : ''
            }`}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {canBookNext && (
          <Button asChild className="font-medium shadow-xs">
            <Link to={`/booking/new?treatmentSessionId=${next.id}&treatmentPlanId=${plan.id}`}>
              <CalendarPlusIcon aria-hidden="true" />
              Đặt lịch buổi tiếp theo
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="font-medium">
          <Link to={`/my-treatment-plans/${plan.id}`}>
            Xem chi tiết liệu trình
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
        {reason && <span className="text-xs text-muted-foreground">{reason}</span>}
      </div>
    </article>
  );
}
