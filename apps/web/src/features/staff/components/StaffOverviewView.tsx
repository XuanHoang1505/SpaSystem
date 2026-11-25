import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  AwardIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ClockIcon,
  HistoryIcon,
  SparklesIcon,
  UserCheckIcon,
} from 'lucide-react';
import type { CareHistoryItem } from '@spa/shared-types';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { useAssignedAppointments, useCareHistory } from '@/features/care/hooks/useCareQueries';
import { CareVisitSheet } from '@/features/care/components/history/CareVisitSheet';
import { OrdersBreadcrumb } from '@/features/orders';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { addDays, formatLongDate, vietnamNow, weekdayName } from '@/lib/formatting/vietnamTime';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { certificationReviewBadge, certificationValidityBadge } from '../certificationStatus';
import { useMyWorkSchedules } from '../hooks/useMySchedule';
import { useMyCertifications } from '../hooks/useStaffCertifications';
import { weekDays, weekRange } from '../myScheduleRange';
import { MyShiftCard } from './my-schedule/MyShiftCard';
import { MyShiftSheet } from './my-schedule/MyShiftSheet';

const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * `/staff` — Tổng quan nhân viên: bảng điều khiển công việc hằng ngày gồm ca làm hôm nay & trong tuần,
 * lịch hẹn được phân công (hôm nay + 14 ngày tới), khách vừa chăm sóc gần đây và trạng thái bằng cấp.
 */
export function StaffOverviewView() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { date: today } = useMemo(() => vietnamNow(), []);
  const week = useMemo(() => weekRange(today), [today]);
  const daysOfWeek = useMemo(() => weekDays(today), [today]);

  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<CareHistoryItem | null>(null);

  const scheduleQuery = useMyWorkSchedules({ fromDate: week.from, toDate: week.to });
  const assignedQuery = useAssignedAppointments({
    fromDate: today,
    toDate: addDays(today, 14),
  });
  const historyQuery = useCareHistory({ pageNumber: 1, pageSize: 5 });
  const certificationsQuery = useMyCertifications();

  const shifts = scheduleQuery.data ?? [];
  const activeWeekShifts = shifts.filter((shift) => shift.status !== 'cancelled');
  const todayShifts = activeWeekShifts.filter((shift) => shift.date === today);

  const appointments = assignedQuery.data ?? [];
  const todayAppointments = appointments.filter((item) => item.date === today);
  const upcomingAppointments = appointments.filter((item) => item.date > today);

  const recentVisits = historyQuery.data?.items ?? [];
  const totalCareCount = historyQuery.data?.totalCount ?? 0;

  const certifications = certificationsQuery.data ?? [];
  const verifiedCertsCount = certifications.filter(
    (item) => item.verificationStatus === 'verified',
  ).length;
  const attentionCertsCount = certifications.filter(
    (item) =>
      item.verificationStatus === 'pending' ||
      item.status === 'expiring_soon' ||
      item.status === 'expired',
  ).length;

  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
        <OrdersBreadcrumb
          trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Tổng quan nhân viên' }]}
        />
        <PageHeader
          title={`Xin chào, ${user?.fullName ?? 'Kỹ thuật viên'}`}
          description={`${formatLongDate(today)} · Theo dõi nhanh ca trực, lịch hẹn được phân công và hồ sơ chăm sóc khách hàng trong ngày.`}
          className="border-b pb-4 sm:items-center"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/staff/schedule">
                  <CalendarDaysIcon aria-hidden="true" />
                  Lịch làm việc
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/staff/bookings">
                  <CalendarCheckIcon aria-hidden="true" />
                  Lịch hẹn phân công
                </Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Ca trực hôm nay
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <ClockIcon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {scheduleQuery.isLoading ? '...' : `${todayShifts.length} ca`}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {todayShifts.length > 0
                  ? todayShifts
                      .map((s) => `${formatLocalTime(s.startTime)}–${formatLocalTime(s.endTime)}`)
                      .join(' · ')
                  : 'Hôm nay chưa có ca trực'}
              </p>
            </div>
            <div className="flex items-center justify-between border-t pt-2.5 text-xs">
              <span className="text-muted-foreground">
                Tuần này: <strong className="text-foreground">{activeWeekShifts.length} ca</strong>
              </span>
              <Link to="/staff/schedule" className="font-medium text-primary hover:underline">
                Chi tiết →
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Lịch hẹn hôm nay
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarCheckIcon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {assignedQuery.isLoading ? '...' : `${todayAppointments.length} buổi`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {todayAppointments.length > 0
                  ? `${todayAppointments.filter((a) => a.status === 'completed').length} đã xong · ${todayAppointments.filter((a) => a.status !== 'completed').length} chờ phục vụ`
                  : 'Chưa có buổi hẹn nào trong hôm nay'}
              </p>
            </div>
            <div className="flex items-center justify-between border-t pt-2.5 text-xs">
              <span className="text-muted-foreground">Theo ngày {dayMonth(today)}</span>
              <Link to="/staff/bookings" className="font-medium text-primary hover:underline">
                Mở danh sách →
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Sắp tới (14 ngày)
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarClockIcon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {assignedQuery.isLoading ? '...' : `${upcomingAppointments.length} buổi`}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {upcomingAppointments[0]
                  ? `Gần nhất: ${dayMonth(upcomingAppointments[0].date)} lúc ${formatLocalTime(upcomingAppointments[0].startTime)}`
                  : 'Chưa có lịch hẹn đặt trước'}
              </p>
            </div>
            <div className="flex items-center justify-between border-t pt-2.5 text-xs">
              <span className="text-muted-foreground">2 tuần kế tiếp</span>
              <Link
                to="/staff/bookings?tab=upcoming"
                className="font-medium text-primary hover:underline"
              >
                Xem lịch sắp tới →
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Hồ sơ & Bằng cấp
              </span>
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <AwardIcon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {historyQuery.isLoading ? '...' : `${totalCareCount} lượt`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {`${verifiedCertsCount}/${certifications.length} bằng cấp đã duyệt`}
                {attentionCertsCount > 0 ? ` · ${attentionCertsCount} cần chú ý` : ''}
              </p>
            </div>
            <div className="flex items-center justify-between border-t pt-2.5 text-xs">
              <Link
                to="/staff/care-history"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Lịch sử chăm sóc
              </Link>
              <Link to="/staff/certifications" className="font-medium text-primary hover:underline">
                Bằng cấp →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3.5">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                  <CalendarCheckIcon className="size-5 text-primary" aria-hidden="true" />
                  Lịch hẹn phân công hôm nay & sắp tới
                </h2>
                <p className="text-xs text-muted-foreground">
                  Bấm vào từng buổi hẹn để xem thông tin dị ứng, lập hồ sơ da và hoàn thành buổi
                  chăm sóc.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/staff/bookings">
                  Xem tất cả
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {assignedQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : assignedQuery.isError ? (
              <ErrorState
                title="Không tải được lịch hẹn phân công"
                onRetry={() => void assignedQuery.refetch()}
                retrying={assignedQuery.isFetching}
              />
            ) : appointments.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Hiện chưa có lịch hẹn nào được phân công cho bạn trong hôm nay và 14 ngày tới.
              </div>
            ) : (
              <ul className="space-y-3">
                {appointments.slice(0, 6).map((item) => {
                  const isToday = item.date === today;
                  const badge = appointmentStatusBadge(item.status);
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center',
                        isToday
                          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                          : 'bg-background/60 hover:bg-muted/40',
                      )}
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              isToday
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground',
                            )}
                          >
                            {isToday
                              ? 'Hôm nay'
                              : `${weekdayName(item.date)}, ${dayMonth(item.date)}`}
                          </span>
                          <span className="text-sm font-semibold tabular-nums">
                            {`${formatLocalTime(item.startTime)} – ${formatLocalTime(item.endTime)}`}
                          </span>
                          <StatusBadge label={badge.label} tone={badge.tone} status={item.status} />
                          {item.hasAllergies && <StatusBadge label="Có dị ứng" tone="warning" />}
                          {item.hasSkinProfile && (
                            <StatusBadge label="Đã có hồ sơ da" tone="info" />
                          )}
                        </div>

                        <p className="font-heading text-base font-semibold text-foreground">
                          {item.service.name}
                          {item.treatmentSession && (
                            <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
                              {`· Buổi ${item.treatmentSession.sequenceNumber}/${item.treatmentSession.totalSessions} (${item.treatmentSession.packageName})`}
                            </span>
                          )}
                        </p>

                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <UserCheckIcon className="size-3.5 text-primary" aria-hidden="true" />
                          <span className="font-medium text-foreground">
                            {item.customer.fullName}
                          </span>
                          <span>· {item.customer.phoneNumber}</span>
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={isToday ? 'default' : 'outline'}
                        className="shrink-0"
                        onClick={() => navigate(`/staff/bookings/${encodeURIComponent(item.id)}`)}
                      >
                        Mở hồ sơ ca
                        <ArrowRightIcon aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3.5">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                  <HistoryIcon className="size-5 text-primary" aria-hidden="true" />
                  Khách vừa chăm sóc gần đây
                </h2>
                <p className="text-xs text-muted-foreground">
                  5 buổi chăm sóc hoàn thành gần nhất. Bấm vào một buổi để xem lại hồ sơ da và ghi
                  chú.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/staff/care-history">
                  Xem toàn bộ ({totalCareCount})
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {historyQuery.isLoading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : recentVisits.length === 0 ? (
              <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                Chưa có lịch sử chăm sóc hoàn thành nào.
              </p>
            ) : (
              <ul className="divide-y rounded-xl border bg-background/50">
                {recentVisits.map((visit) => (
                  <li key={visit.appointmentId}>
                    <button
                      type="button"
                      onClick={() => setSelectedVisit(visit)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {visit.customer.fullName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {visit.customer.phoneNumber}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/90">
                            {visit.service.name}
                          </span>
                          {visit.treatmentSession &&
                            ` · Buổi ${visit.treatmentSession.sequenceNumber}/${visit.treatmentSession.totalSessions} (${visit.treatmentSession.packageName})`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <StatusBadge
                          label={visit.skinProfileId ? 'Đã có hồ sơ da' : 'Chưa có hồ sơ da'}
                          tone={visit.skinProfileId ? 'success' : 'neutral'}
                        />
                        <div className="text-right text-xs tabular-nums">
                          <p className="font-semibold text-foreground">
                            {formatLocalDate(visit.date)}
                          </p>
                          <p className="text-muted-foreground">
                            {`${formatLocalTime(visit.startTime)} – ${formatLocalTime(visit.endTime)}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3.5">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                  <CalendarDaysIcon className="size-5 text-primary" aria-hidden="true" />
                  Ca làm việc tuần này
                </h2>
                <p className="text-xs text-muted-foreground">
                  {`Tuần ${dayMonth(week.from)} – ${dayMonth(week.to)}/${week.to.slice(0, 4)}`}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/staff/schedule">
                  Lịch tuần / tháng
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {scheduleQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {daysOfWeek.map((day) => {
                  const isToday = day === today;
                  const dayShifts = shifts.filter((s) => s.date === day);
                  return (
                    <li
                      key={day}
                      className={cn(
                        'flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between',
                        isToday ? 'border-primary/40 bg-primary/5' : 'bg-background/50',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex min-w-24 items-center gap-1.5 text-xs font-semibold',
                            isToday ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {weekdayName(day)}
                          <span className="font-normal text-muted-foreground">{dayMonth(day)}</span>
                        </span>
                        {isToday && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            Hôm nay
                          </span>
                        )}
                      </div>

                      {dayShifts.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Nghỉ / Chưa phân ca</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 sm:justify-end">
                          {dayShifts.map((shift) => (
                            <div key={shift.id} className="w-fit">
                              <MyShiftCard shift={shift} compact onOpen={setOpenShiftId} />
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3.5">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                  <AwardIcon className="size-5 text-primary" aria-hidden="true" />
                  Bằng cấp & chứng chỉ ({certifications.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Trạng thái hiệu lực và xét duyệt từ chủ spa.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/staff/certifications">
                  Quản lý
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {certificationsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : certifications.length === 0 ? (
              <div className="space-y-2 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                <p>Bạn chưa khai báo bằng cấp hoặc chứng chỉ nào.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/staff/certifications">Thêm bằng cấp ngay</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {certifications.map((cert) => {
                  const validity = certificationValidityBadge(cert.status);
                  const reviewBadge = certificationReviewBadge(cert.verificationStatus);
                  return (
                    <li
                      key={cert.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/60 p-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-medium text-foreground">{cert.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {cert.issuer ?? 'Chứng chỉ chuyên môn'}
                          {cert.expiresOn
                            ? ` · Hết hạn ${formatLocalDate(cert.expiresOn)}`
                            : ' · Không thời hạn'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <StatusBadge label={validity.label} tone={validity.tone} />
                        <StatusBadge label={reviewBadge.label} tone={reviewBadge.tone} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Các chứng chỉ ở trạng thái <strong className="text-foreground">Đã duyệt</strong> và{' '}
                <strong className="text-foreground">Còn hiệu lực</strong> sẽ hiển thị công khai trên
                trang chi tiết dịch vụ bạn phụ trách.
              </span>
            </div>
          </section>
        </div>
      </div>

      <MyShiftSheet shiftId={openShiftId} onClose={() => setOpenShiftId(null)} />
      <CareVisitSheet
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
        onOpenVisit={setSelectedVisit}
      />
    </div>
  );
}
