import { CalendarClockIcon, SearchIcon, SparklesIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { TreatmentPlanStatus } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { foldText } from '@/lib/text';
import { cn } from '@/lib/utils';
import { useMyTreatments } from '../hooks/useMyTreatments';
import { TreatmentPlanCard } from './TreatmentPlanCard';

type StatusFilter = 'all' | TreatmentPlanStatus;

const filterOptions: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'in_progress', label: 'Đang thực hiện' },
  { value: 'not_started', label: 'Chưa bắt đầu' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'paused', label: 'Tạm dừng' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export function MyTreatmentPlansView() {
  useDocumentTitle('Liệu trình của tôi');
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status') as TreatmentPlanStatus | null;
  const currentStatus: StatusFilter =
    statusParam && ['in_progress', 'not_started', 'completed', 'paused', 'cancelled'].includes(statusParam)
      ? statusParam
      : 'all';

  const searchQuery = searchParams.get('q') ?? '';

  const apiStatus = currentStatus === 'all' ? undefined : currentStatus;
  const { data: plans, isLoading, isError, refetch } = useMyTreatments(apiStatus);

  const filteredPlans = useMemo(() => {
    if (!plans) return [];
    if (!searchQuery.trim()) return plans;
    const query = foldText(searchQuery.trim());
    return plans.filter((plan) => foldText(plan.packageName).includes(query));
  }, [plans, searchQuery]);

  const handleStatusChange = (status: StatusFilter) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (status === 'all') {
        next.delete('status');
      } else {
        next.set('status', status);
      }
      return next;
    });
  };

  const handleSearchChange = (q: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q.trim()) {
        next.set('q', q);
      } else {
        next.delete('q');
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tài khoản khách hàng"
        title="Liệu trình của tôi"
        description="Theo dõi tiến độ phác đồ chăm sóc da và đặt lịch cho các buổi tiếp theo."
      />

      {/* Filter toolbar */}
      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {filterOptions.map((opt) => {
              const active = currentStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Tìm theo tên gói..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* State rendering */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Không thể tải danh sách liệu trình"
          message="Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại sau."
          onRetry={() => refetch()}
        />
      ) : !plans || plans.length === 0 ? (
        currentStatus !== 'all' || searchQuery.trim() ? (
          <EmptyState
            icon={CalendarClockIcon}
            title="Không tìm thấy liệu trình phù hợp"
            description="Không có liệu trình nào khớp với bộ lọc hoặc từ khóa tìm kiếm của bạn."
            action={
              <Button variant="outline" onClick={handleClearFilters}>
                Xem tất cả liệu trình
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={SparklesIcon}
            title="Bạn chưa có liệu trình chăm sóc nào"
            description="Hãy trải nghiệm các gói liệu trình chăm sóc da chuyên sâu tại Như Nguyệt Spa để có làn da khỏe đẹp."
            action={
              <Button asChild>
                <Link to="/packages">Khám phá gói dịch vụ</Link>
              </Button>
            }
          />
        )
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={CalendarClockIcon}
          title="Không tìm thấy liệu trình phù hợp"
          description={`Không tìm thấy kết quả nào cho "${searchQuery}".`}
          action={
            <Button variant="outline" onClick={handleClearFilters}>
              Đặt lại tìm kiếm
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPlans.map((plan) => (
            <TreatmentPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
