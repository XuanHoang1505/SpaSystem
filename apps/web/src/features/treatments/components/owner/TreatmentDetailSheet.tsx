import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  PencilIcon,
  PowerIcon,
  UserCheckIcon,
  UserIcon,
} from 'lucide-react';
import type {
  CareHistoryEntryDto,
  TreatmentPlanDto,
  TreatmentSessionDto,
  TreatmentSkinProfileDto,
} from '@spa/shared-types';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { useOwnerTreatment } from '../../hooks/useOwnerTreatments';
import {
  skinTypeLabels,
  treatmentPlanStatusBadge,
  treatmentSessionStatusBadge,
} from '../../treatmentStatus';

export interface TreatmentDetailSheetProps {
  treatmentId: string | null;
  onClose: () => void;
  onEditTreatment: (detail: TreatmentPlanDto) => void;
  onAssignStaff: (detail: TreatmentPlanDto) => void;
  onChangeStatus: (detail: TreatmentPlanDto) => void;
  onEditSessionNote: (treatmentId: string, session: TreatmentSessionDto) => void;
}

function formatUtcDate(utc: string | null | undefined): string {
  if (!utc) return '—';
  try {
    return formatLocalDate(vietnamDateOf(utc));
  } catch {
    return formatLocalDate(utc);
  }
}

export function TreatmentDetailSheet({
  treatmentId,
  onClose,
  onEditTreatment,
  onAssignStaff,
  onChangeStatus,
  onEditSessionNote,
}: TreatmentDetailSheetProps) {
  const query = useOwnerTreatment(treatmentId, Boolean(treatmentId));
  const detail = query.data;

  const isTerminal = detail?.status === 'completed' || detail?.status === 'cancelled';

  return (
    <Sheet open={Boolean(treatmentId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto bg-card p-6 shadow-xl sm:max-w-xl">
        {query.isLoading ? (
          <div className="space-y-4 pt-6" data-testid="treatment-sheet-skeleton">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator className="my-4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : query.isError || !detail ? (
          <div className="pt-6">
            <ErrorState
              title="Không thể tải chi tiết liệu trình"
              message="Đã xảy ra lỗi khi tải dữ liệu liệu trình từ máy chủ."
              onRetry={() => {
                void query.refetch();
              }}
            />
          </div>
        ) : (
          <div className="space-y-6 pt-2 pb-6">
            {/* Sheet Header */}
            <SheetHeader className="space-y-2 border-b pb-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SheetTitle className="font-heading text-lg font-bold text-foreground sm:text-xl">
                  {detail.packageName}
                </SheetTitle>
                {(() => {
                  const badge = treatmentPlanStatusBadge(detail.status);
                  return <StatusBadge label={badge.label} tone={badge.tone} status={detail.status} />;
                })()}
              </div>

              <SheetDescription asChild>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{detail.customer.fullName}</span>
                    <span>•</span>
                    <span>{detail.customer.phoneNumber || 'Chưa có SĐT'}</span>
                  </div>
                  <div>
                    Ngày mua gói:{' '}
                    <span className="font-medium text-foreground">
                      {formatUtcDate(detail.purchasedAtUtc)}
                    </span>
                  </div>
                </div>
              </SheetDescription>
            </SheetHeader>

            {/* Allergy Alert */}
            {detail.hasAllergies && (
              <Alert
                variant="destructive"
                className="border-warning/50 bg-warning/10 text-warning-foreground"
              >
                <AlertTriangleIcon className="size-4 text-warning" aria-hidden="true" />
                <AlertTitle className="font-semibold">Cảnh báo dị ứng</AlertTitle>
                <AlertDescription className="text-xs">
                  Khách hàng có tiền sử dị ứng. Vui lòng kiểm tra kỹ hồ sơ da và ghi chú trước khi
                  thực hiện dịch vụ hoặc sử dụng mỹ phẩm.
                </AlertDescription>
              </Alert>
            )}

            {/* Status Reason Banner (Paused / Cancelled) */}
            {detail.statusReason && (
              <Alert className="border-warning/40 bg-warning/5 text-foreground">
                <AlertCircleIcon className="size-4 text-warning" aria-hidden="true" />
                <AlertTitle className="font-semibold">
                  {detail.status === 'paused' ? 'Lý do tạm dừng liệu trình' : 'Lý do hủy liệu trình'}
                </AlertTitle>
                <AlertDescription className="text-xs whitespace-pre-wrap">
                  {detail.statusReason}
                </AlertDescription>
              </Alert>
            )}

            {/* Phác đồ điều trị section */}
            <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <h3 className="font-heading text-sm font-bold tracking-tight text-foreground uppercase">
                Phác đồ điều trị
              </h3>

              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Mục tiêu điều trị:</span>
                  <p className="font-medium text-foreground whitespace-pre-wrap">
                    {detail.goal || 'Chưa thiết lập'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground">Ghi chú nội bộ:</span>
                  <p className="font-medium text-foreground whitespace-pre-wrap">
                    {detail.note || 'Chưa có ghi chú'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground">Kỹ thuật viên phụ trách:</span>
                  <p className="font-medium text-foreground">
                    {detail.primaryStaff?.fullName ?? 'Chưa phân công'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground">Tiến độ buổi:</span>
                  <p className="font-medium text-foreground">
                    {detail.usedSessions}/{detail.totalSessions} buổi đã thực hiện
                    {detail.bookedSessions > 0 && ` (${detail.bookedSessions} đã đặt lịch)`}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground">Ngày bắt đầu:</span>
                  <p className="font-medium text-foreground">
                    {detail.startDate ? formatLocalDate(detail.startDate) : '—'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground">Ngày dự kiến kết thúc:</span>
                  <p className="font-medium text-foreground">
                    {detail.expectedEndDate ? formatLocalDate(detail.expectedEndDate) : '—'}
                  </p>
                </div>

                {detail.actualEndDate && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Ngày thực tế kết thúc:</span>
                    <p className="font-medium text-foreground">
                      {formatLocalDate(detail.actualEndDate)}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Timeline các buổi chăm sóc */}
            <section className="space-y-3">
              <h3 className="font-heading text-sm font-bold tracking-tight text-foreground uppercase">
                Danh sách các buổi chăm sóc ({detail.sessions.length})
              </h3>

              <div className="space-y-3">
                {[...detail.sessions]
                  .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                  .map((session) => {
                    const sessionBadge = treatmentSessionStatusBadge(session.status);
                    return (
                      <div
                        key={session.id}
                        className="space-y-2 rounded-xl border bg-card p-3.5 shadow-2xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {session.sequenceNumber}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {session.serviceName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              label={sessionBadge.label}
                              tone={sessionBadge.tone}
                              status={session.status}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditSessionNote(detail.id, session)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Sửa ghi chú buổi"
                              aria-label={`Sửa ghi chú buổi ${session.sequenceNumber}`}
                            >
                              <PencilIcon className="size-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ClockIcon className="size-3.5" aria-hidden="true" />
                          <span>Thời lượng: {session.durationMinutes} phút</span>
                        </div>

                        {/* Appointment Info if booked/completed */}
                        {session.appointment && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <CalendarDaysIcon className="size-3.5 text-primary" aria-hidden="true" />
                              <span>
                                {formatLocalDate(session.appointment.date)} ({session.appointment.startTime} – {session.appointment.endTime})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <UserIcon className="size-3 text-primary" aria-hidden="true" />
                              <span>{session.appointment.staff.fullName}</span>
                            </div>
                          </div>
                        )}

                        {/* Session Note */}
                        {session.note && (
                          <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">
                            <span className="font-semibold text-muted-foreground">Ghi chú: </span>
                            <span className="whitespace-pre-wrap">{session.note}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* Hồ sơ da */}
            <section className="space-y-3">
              <h3 className="font-heading text-sm font-bold tracking-tight text-foreground uppercase">
                Hồ sơ da ({detail.skinProfiles.length})
              </h3>

              {detail.skinProfiles.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Chưa có hồ sơ da được lập trong liệu trình này.
                </p>
              ) : (
                <div className="space-y-3">
                  {detail.skinProfiles.map((profile: TreatmentSkinProfileDto) => (
                    <div
                      key={profile.id}
                      className="space-y-2 rounded-xl border bg-muted/10 p-3.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <div className="font-medium text-foreground">
                          Đánh giá ngày: {formatUtcDate(profile.assessedAtUtc)}
                        </div>
                        <div className="text-muted-foreground">
                          Bởi: {profile.assessedBy.fullName}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <span className="text-muted-foreground">Loại da: </span>
                          <span className="font-semibold text-foreground">
                            {skinTypeLabels[profile.skinType] ?? profile.skinType}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vấn đề chính: </span>
                          <span className="font-medium text-foreground">
                            {profile.mainConcerns || 'Không ghi nhận'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Mục tiêu chăm sóc: </span>
                          <span className="font-medium text-foreground">
                            {profile.careGoals || 'Không ghi nhận'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Chỉ định trị liệu: </span>
                          <span className="font-medium text-foreground">
                            {profile.recommendedTreatment || 'Không ghi nhận'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Lịch sử chăm sóc */}
            <section className="space-y-3">
              <h3 className="font-heading text-sm font-bold tracking-tight text-foreground uppercase">
                Lịch sử chăm sóc ({detail.careHistory.length})
              </h3>

              {detail.careHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Chưa có lịch sử buổi chăm sóc.
                </p>
              ) : (
                <div className="space-y-3">
                  {detail.careHistory.map((entry: CareHistoryEntryDto, idx) => {
                    const badge = appointmentStatusBadge(entry.status);
                    return (
                      <div
                        key={`${entry.appointmentId}-${idx}`}
                        className="space-y-2 rounded-xl border bg-muted/10 p-3.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <span>
                              {formatLocalDate(entry.date)} ({entry.startTime} – {entry.endTime})
                            </span>
                            <span>•</span>
                            <span className="text-muted-foreground">Buổi {entry.sequenceNumber}</span>
                          </div>
                          <StatusBadge label={badge.label} tone={badge.tone} status={entry.status} />
                        </div>

                        <div className="text-muted-foreground">
                          Kỹ thuật viên thực hiện: <span className="font-medium text-foreground">{entry.staff.fullName}</span>
                        </div>

                        {entry.result && (
                          <div className="rounded-lg bg-muted/30 p-2 text-foreground">
                            <span className="font-semibold text-muted-foreground">Kết quả: </span>
                            <span className="whitespace-pre-wrap">{entry.result}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Footer Action Buttons */}
            <SheetFooter className="gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              {detail.canEdit && !isTerminal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditTreatment(detail)}
                  className="gap-1.5"
                >
                  <PencilIcon className="size-3.5" aria-hidden="true" />
                  Sửa phác đồ
                </Button>
              )}

              {detail.canManage && !isTerminal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAssignStaff(detail)}
                  className="gap-1.5"
                >
                  <UserCheckIcon className="size-3.5" aria-hidden="true" />
                  Đổi nhân viên
                </Button>
              )}

              {detail.canManage && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onChangeStatus(detail)}
                  className="gap-1.5"
                >
                  <PowerIcon className="size-3.5" aria-hidden="true" />
                  Chuyển trạng thái
                </Button>
              )}
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
