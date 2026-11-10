import { ArrowLeftIcon, CalendarClockIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError, treatmentErrorCodes } from '@spa/api-client';
import type { MyTreatmentSession } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderDetailSheet } from '@/features/orders';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMyTreatmentPlan } from '../hooks/useMyTreatmentPlan';
import { TreatmentPlanOverviewCard } from './TreatmentPlanOverviewCard';
import { TreatmentSessionDetailSheet } from './TreatmentSessionDetailSheet';
import { TreatmentSessionTimeline } from './TreatmentSessionTimeline';

const isNotFound = (error: unknown) =>
  error instanceof ApiClientError &&
  (error.status === 404 ||
    error.errors.some((item) => item.code === treatmentErrorCodes.treatmentPlanNotFound));

export function MyTreatmentPlanDetailView({ planId }: { planId: string }) {
  const { data: plan, isLoading, isError, error, refetch } = useMyTreatmentPlan(planId);
  useDocumentTitle(plan?.packageName ? `Liệu trình ${plan.packageName}` : 'Chi tiết liệu trình');

  const [selectedSession, setSelectedSession] = useState<MyTreatmentSession | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; code: string } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    if (isNotFound(error)) {
      return (
        <EmptyState
          icon={CalendarClockIcon}
          title="Không tìm thấy liệu trình"
          description="Liệu trình này không tồn tại hoặc không thuộc tài khoản của bạn."
          action={
            <Button asChild>
              <Link to="/my-treatment-plans">Về danh sách liệu trình</Link>
            </Button>
          }
        />
      );
    }
    return (
      <ErrorState
        title="Không thể tải chi tiết liệu trình"
        message="Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại sau."
        onRetry={() => refetch()}
      />
    );
  }

  if (!plan) return null;

  return (
    <div className="space-y-6">
      {/* Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="font-medium -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/my-treatment-plans">
            <ArrowLeftIcon className="size-4 mr-1.5" aria-hidden="true" />
            Quay lại danh sách liệu trình
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          <Link to="/account" className="hover:underline">
            Tài khoản
          </Link>
          <span className="mx-2">/</span>
          <Link to="/my-treatment-plans" className="hover:underline">
            Liệu trình
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">{plan.packageName}</span>
        </div>
      </div>

      {/* Plan overview card */}
      <TreatmentPlanOverviewCard
        plan={plan}
        onViewOrder={(order) => setSelectedOrder(order)}
      />

      {/* Sessions timeline */}
      <TreatmentSessionTimeline
        planId={plan.id}
        sessions={plan.sessions}
        onViewSessionResult={(session) => setSelectedSession(session)}
      />

      {/* Session detail sheet */}
      <TreatmentSessionDetailSheet
        planId={plan.id}
        session={selectedSession}
        open={selectedSession !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
      />

      {/* Order detail sheet */}
      <OrderDetailSheet
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
