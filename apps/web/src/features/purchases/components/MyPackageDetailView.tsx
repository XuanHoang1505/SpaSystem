import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarPlusIcon,
  PackageSearchIcon,
  SparklesIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError, purchaseErrorCodes, treatmentErrorCodes } from '@spa/api-client';
import type { MyTreatmentSession } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderDetailSheet, OrdersErrorState } from '@/features/orders';
import { OrdersBreadcrumb } from '@/features/orders/components/OrdersBreadcrumb';
import { bookingPath } from '@/features/bookings/bookingParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { daysLeft } from '../filter';
import { usePurchasedPackage } from '../hooks/usePurchasedPackage';
import { useTreatmentPlan } from '../hooks/useTreatmentPlan';
import { packageStatusBadge } from '../purchaseStatus';
import { SessionJournal } from './SessionJournal';
import { SessionResultDialog } from './SessionResultDialog';

const notFound = (error: unknown) =>
  error instanceof ApiClientError &&
  error.errors.some(
    (item) =>
      item.code === purchaseErrorCodes.customerPackageNotFound ||
      item.code === treatmentErrorCodes.treatmentPlanNotFound,
  );

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 rounded-xl bg-muted/50 p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
}

/** Chi tiết gói kèm nhật ký liệu trình (UC-SPA-18, with the read-only plan of UC-SPA-19). */
export function MyPackageDetailView({ packageId }: { packageId: string }) {
  useDocumentTitle('Chi tiết gói của tôi');
  const pkg = usePurchasedPackage(packageId);
  const plan = useTreatmentPlan(pkg.data?.treatmentPlan.id);
  const [viewingOrder, setViewingOrder] = useState<{ id: string; code: string } | null>(null);
  const [note, setNote] = useState<MyTreatmentSession | null>(null);

  const failed = pkg.isError ? pkg : plan.isError ? plan : null;
  if (failed && notFound(failed.error))
    return (
      <EmptyState
        icon={PackageSearchIcon}
        title="Không tìm thấy gói"
        description="Gói này không tồn tại hoặc không thuộc tài khoản của bạn."
        action={
          <Button asChild>
            <Link to="/my-packages">Về Gói của tôi</Link>
          </Button>
        }
      />
    );
  if (failed)
    return (
      <OrdersErrorState
        error={failed.error}
        title="Không tải được gói"
        onRetry={() => void failed.refetch()}
        retrying={failed.isFetching}
      />
    );
  if (pkg.isPending || plan.isPending || !pkg.data || !plan.data)
    return (
      <div data-testid="package-detail-skeleton" className="space-y-4">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );

  const data = plan.data;
  const badge = packageStatusBadge(pkg.data.status);
  const left = data.totalSessions - data.usedSessions;
  const percent =
    data.totalSessions > 0 ? Math.round((data.usedSessions / data.totalSessions) * 100) : 0;
  const days = pkg.data.status === 'active' ? daysLeft(data.expiresAtUtc) : null;
  const next = data.nextSession;
  const showReason = (data.status === 'paused' || data.status === 'cancelled') && data.statusReason;

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <div className="space-y-3 border-b pb-5">
        <OrdersBreadcrumb
          trail={[
            { label: 'Trang chủ', to: '/' },
            { label: 'Tài khoản', to: '/account' },
            { label: 'Gói của tôi', to: '/my-packages' },
            { label: data.packageName },
          ]}
        />
        <Link
          to="/my-packages"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Quay lại danh sách gói
        </Link>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <StatusBadge label={badge.label} tone={badge.tone} status={pkg.data.status} />
          <button
            type="button"
            onClick={() => setViewingOrder(data.order)}
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            {`Đơn ${data.order.code}`}
          </button>
          <span>{`Mua ngày ${formatLocalDate(vietnamDateOf(data.purchasedAtUtc))}`}</span>
        </div>
        <PageHeader title={data.packageName} className="pb-0" />
        {data.goal && <p className="text-sm text-muted-foreground">{data.goal}</p>}

        {showReason && (
          <Alert>
            <AlertTitle>
              {data.status === 'paused' ? 'Liệu trình đang tạm dừng' : 'Liệu trình đã hủy'}
            </AlertTitle>
            <AlertDescription>{data.statusReason}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Tiến trình thực hiện">
            <p className="text-sm font-semibold">{`${data.usedSessions}/${data.totalSessions} buổi hoàn thành`}</p>
            <div
              role="progressbar"
              aria-label="Tiến độ liệu trình"
              aria-valuemin={0}
              aria-valuemax={data.totalSessions}
              aria-valuenow={data.usedSessions}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{`${percent}% hoàn thành`}</p>
          </Metric>
          <Metric label="Số buổi còn lại">
            <p className="text-sm font-semibold">{`Còn ${left} buổi`}</p>
            {data.bookedSessions > 0 && (
              <p className="text-xs text-muted-foreground">{`${data.bookedSessions} buổi đã đặt lịch`}</p>
            )}
          </Metric>
          <Metric label="Thời hạn">
            {data.expiresAtUtc ? (
              <>
                <p className="text-sm font-semibold">{`Hạn đến ${formatLocalDate(vietnamDateOf(data.expiresAtUtc))}`}</p>
                <p className="text-xs text-muted-foreground">
                  {pkg.data.status === 'expired'
                    ? 'Đã hết hạn'
                    : days !== null
                      ? `Còn ${days} ngày`
                      : ''}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold">Không giới hạn thời gian</p>
            )}
          </Metric>
        </div>

        {data.primaryStaff && (
          <p className="text-sm text-muted-foreground">{`Kỹ thuật viên phụ trách: ${data.primaryStaff.fullName}`}</p>
        )}
        {next?.canBook && data.status !== 'paused' && data.status !== 'cancelled' && (
          <Button asChild>
            <Link
              to={bookingPath({
                kind: 'session',
                treatmentSessionId: next.id,
                treatmentPlanId: data.id,
              })}
            >
              <CalendarPlusIcon aria-hidden="true" />
              {`Đặt lịch buổi tiếp theo (Buổi ${next.sequenceNumber})`}
            </Link>
          </Button>
        )}
      </div>

      {pkg.data.items && pkg.data.items.length > 0 && (
        <section
          aria-labelledby="package-items-title"
          className="space-y-3 rounded-2xl border bg-card p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center justify-between border-b pb-3">
            <h2
              id="package-items-title"
              className="font-sans text-base font-semibold text-foreground sm:text-lg"
            >
              Cơ cấu dịch vụ trong gói
            </h2>
            <span className="text-xs text-muted-foreground">{pkg.data.items.length} dịch vụ</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pkg.data.items.map((item) => (
              <div
                key={item.spaServiceId}
                className="flex flex-col justify-between space-y-2 rounded-xl border bg-muted/20 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">{item.serviceName}</span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {item.totalSessions} buổi
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{`Đã thực hiện: ${item.completedSessions}/${item.totalSessions}`}</span>
                  {item.bookedSessions > 0 && (
                    <span className="font-medium text-foreground">{`· Đã hẹn: ${item.bookedSessions}`}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
            <h3 className="font-semibold text-foreground">Phác đồ & Nhật ký chăm sóc da</h3>
          </div>
          <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
            {data.goal ? `Mục tiêu phác đồ: "${data.goal}". ` : ''}
            Gói dịch vụ này đi kèm phác đồ điều trị được cá nhân hóa. Bạn có thể theo dõi chi tiết
            tình trạng da và lưu ý phục hồi sau mỗi buổi tại mục Liệu trình.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Link to={`/my-treatment-plans/${data.id}`}>
            Xem phác đồ điều trị
            <ArrowRightIcon className="ml-1.5 size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <section aria-labelledby="journal-title" className="space-y-3">
        <h2 id="journal-title" className="font-sans text-lg font-semibold">
          {`Nhật ký liệu trình ${data.totalSessions} buổi`}
        </h2>
        <SessionJournal planId={data.id} sessions={data.sessions} onViewNote={setNote} />
      </section>

      <OrderDetailSheet order={viewingOrder} onClose={() => setViewingOrder(null)} />
      <SessionResultDialog planId={data.id} session={note} onClose={() => setNote(null)} />
    </section>
  );
}
