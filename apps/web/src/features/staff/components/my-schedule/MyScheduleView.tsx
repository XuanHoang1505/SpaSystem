import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrdersBreadcrumb } from '@/features/orders';
import { useMyWorkSchedules } from '../../hooks/useMySchedule';
import { MyMonthGrid, MyWeekGrid } from './MyScheduleGrids';
import { MyShiftSheet } from './MyShiftSheet';
import { useMyScheduleParams } from './useMyScheduleParams';

const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** SCR-W25 (UC-SPA-24): the staff member's shifts by week or month, cancelled ones included. */
export function MyScheduleView() {
  const params = useMyScheduleParams();
  const query = useMyWorkSchedules({ fromDate: params.range.from, toDate: params.range.to });
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const isWeek = params.view === 'week';

  const rangeLabel = isWeek
    ? `${dayMonth(params.range.from)} – ${dayMonth(params.range.to)}/${params.range.to.slice(0, 4)}`
    : `Tháng ${Number(params.date.slice(5, 7))}/${params.date.slice(0, 4)}`;
  const shifts = query.data ?? [];
  // Month: only shifts of the month itself count as "has shifts"; the grid also shows neighbouring days.
  const visibleShifts = isWeek
    ? shifts
    : shifts.filter((shift) => shift.date.slice(0, 7) === params.date.slice(0, 7));

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
      <OrdersBreadcrumb trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Lịch làm việc' }]} />

      <Tabs
        value={params.view}
        onValueChange={(value) => params.setView(value === 'month' ? 'month' : 'week')}
      >
        <PageHeader
          title="Lịch làm việc"
          description="Các ca làm việc spa phân cho bạn. Chọn một ca để xem lịch hẹn trong ca."
          className="border-b pb-4 sm:items-center"
          actions={
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="week">Tuần</TabsTrigger>
              <TabsTrigger value="month">Tháng</TabsTrigger>
            </TabsList>
          }
        />
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => params.step(-1)}
            aria-label={isWeek ? 'Tuần trước' : 'Tháng trước'}
          >
            <ChevronLeftIcon aria-hidden="true" />
            <span className="hidden sm:inline">{isWeek ? 'Tuần trước' : 'Tháng trước'}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={params.goToday}>
            {isWeek ? 'Hôm nay' : 'Tháng này'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => params.step(1)}
            aria-label={isWeek ? 'Tuần sau' : 'Tháng sau'}
          >
            <span className="hidden sm:inline">{isWeek ? 'Tuần sau' : 'Tháng sau'}</span>
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
        <p className="font-heading text-base font-semibold" aria-live="polite">
          {rangeLabel}
        </p>
      </div>

      {query.isLoading ? (
        <div className="grid gap-2 lg:grid-cols-7" aria-label="Đang tải lịch làm việc">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Không tải được lịch làm việc"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <>
          {visibleShifts.length === 0 && (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              {`Bạn chưa có ca làm trong ${isWeek ? 'tuần' : 'tháng'} này.`}
            </p>
          )}
          {isWeek ? (
            <MyWeekGrid
              date={params.date}
              today={params.today}
              shifts={shifts}
              onOpen={setOpenShiftId}
            />
          ) : (
            <MyMonthGrid
              date={params.date}
              today={params.today}
              shifts={shifts}
              onOpen={setOpenShiftId}
            />
          )}
        </>
      )}

      <MyShiftSheet shiftId={openShiftId} onClose={() => setOpenShiftId(null)} />
    </section>
  );
}
