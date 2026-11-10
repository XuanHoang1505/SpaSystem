import {
  AlertTriangleIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  ClockIcon,
  SparklesIcon,
  TargetIcon,
  UserRoundIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyTreatmentPlan } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { packageStatusBadge } from '@/features/purchases/purchaseStatus';
import { daysLeft } from '@/features/purchases/filter';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { treatmentPlanStatusBadge } from '../treatmentStatus';

export function TreatmentPlanOverviewCard({
  plan,
  onViewOrder,
}: {
  plan: MyTreatmentPlan;
  onViewOrder: (order: { id: string; code: string }) => void;
}) {
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
  const percent =
    plan.totalSessions > 0 ? Math.min(100, (plan.usedSessions / plan.totalSessions) * 100) : 0;

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {plan.packageName}
            </h2>
            <StatusBadge label={planBadge.label} tone={planBadge.tone} status={plan.status} />
            {plan.packageStatus !== 'active' && (
              <StatusBadge label={pkgBadge.label} tone={pkgBadge.tone} status={plan.packageStatus} />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => onViewOrder(plan.order)}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {`Đơn hàng #${plan.order.code}`}
            </button>
            <span>·</span>
            <span>{`Mua ngày ${formatLocalDate(vietnamDateOf(plan.purchasedAtUtc))}`}</span>
          </div>
        </div>

        {canBookNext && (
          <Button asChild className="font-medium shadow-xs">
            <Link
              to={`/booking/new?treatmentSessionId=${next.id}&treatmentPlanId=${plan.id}`}
            >
              <CalendarPlusIcon aria-hidden="true" />
              {`Đặt lịch buổi tiếp theo (Buổi ${next.sequenceNumber})`}
            </Link>
          </Button>
        )}
      </div>

      {plan.statusReason && (plan.status === 'paused' || plan.status === 'cancelled') && (
        <Alert variant={plan.status === 'cancelled' ? 'destructive' : 'default'} className="border-warning/50 bg-warning/10 text-foreground">
          <AlertTriangleIcon className="size-4 text-warning" aria-hidden="true" />
          <AlertTitle className="font-semibold">
            {plan.status === 'paused' ? 'Liệu trình đang tạm dừng' : 'Liệu trình đã hủy'}
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground mt-1">
            {`Lý do: ${plan.statusReason}`}
          </AlertDescription>
        </Alert>
      )}

      {plan.goal && (
        <div className="flex items-start gap-3 rounded-xl border border-secondary bg-secondary/20 p-4">
          <TargetIcon className="size-5 shrink-0 text-primary mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mục tiêu chăm sóc da
            </h4>
            <p className="text-sm font-medium text-foreground italic leading-relaxed">
              "{plan.goal}"
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        {plan.primaryStaff && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
            <UserRoundIcon className="size-4 text-primary shrink-0" aria-hidden="true" />
            <div>
              <span className="text-muted-foreground">Kỹ thuật viên phụ trách:</span>
              <p className="font-medium text-foreground">{plan.primaryStaff.fullName}</p>
            </div>
          </div>
        )}
        {plan.startDate && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
            <CalendarCheckIcon className="size-4 text-primary shrink-0" aria-hidden="true" />
            <div>
              <span className="text-muted-foreground">Ngày bắt đầu:</span>
              <p className="font-medium text-foreground">{formatLocalDate(plan.startDate)}</p>
            </div>
          </div>
        )}
        {plan.expectedEndDate && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3">
            <CalendarClockIcon className="size-4 text-primary shrink-0" aria-hidden="true" />
            <div>
              <span className="text-muted-foreground">Dự kiến kết thúc:</span>
              <p className="font-medium text-foreground">{formatLocalDate(plan.expectedEndDate)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <CircleCheckIcon className="size-4 text-primary" aria-hidden="true" />
            {`Tiến trình thực hiện: ${plan.usedSessions}/${plan.totalSessions} buổi hoàn thành`}
          </span>
          <span className="text-xs font-semibold text-primary">{`Còn ${left} buổi (${Math.round(percent)}%)`}</span>
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
              {`${plan.bookedSessions} buổi đã đặt lịch hẹn`}
            </span>
          ) : (
            <span />
          )}
          {plan.expiresAtUtc ? (
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-3.5" aria-hidden="true" />
              <span>{`Hạn sử dụng gói đến ${formatLocalDate(vietnamDateOf(plan.expiresAtUtc))}`}</span>
              {days !== null && (
                <span className="font-medium text-foreground">{`Còn ${days} ngày`}</span>
              )}
            </div>
          ) : (
            <span>Không giới hạn thời gian</span>
          )}
        </div>
      </div>
    </div>
  );
}
