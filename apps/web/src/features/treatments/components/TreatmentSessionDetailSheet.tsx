import { FileTextIcon, SparklesIcon, UserRoundIcon } from 'lucide-react';
import type { MyTreatmentSession } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { useMyTreatmentSession } from '../hooks/useMyTreatmentSession';
import { treatmentSessionStatusBadge } from '../treatmentStatus';

export function TreatmentSessionDetailSheet({
  planId,
  session,
  open,
  onOpenChange,
}: {
  planId: string;
  session: MyTreatmentSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useMyTreatmentSession(planId, session?.id ?? '', open);
  if (!session) return null;

  const badge = treatmentSessionStatusBadge(session.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-1 border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {`Buổi ${session.sequenceNumber}`}
            </span>
            <StatusBadge label={badge.label} tone={badge.tone} status={session.status} />
          </div>
          <SheetTitle className="font-heading text-xl font-bold text-foreground">
            {session.serviceName}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {`Thời lượng: ${session.durationMinutes} phút`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {session.appointment && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Thông tin lịch thực hiện
              </h4>
              <div className="text-sm font-medium text-foreground">
                {`${formatLocalDate(session.appointment.date)} · ${session.appointment.startTime} – ${session.appointment.endTime}`}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserRoundIcon className="size-3.5 text-primary" aria-hidden="true" />
                <span>{`Kỹ thuật viên: ${session.appointment.staff.fullName}`}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileTextIcon className="size-4 text-primary" aria-hidden="true" />
              Ghi chú kết quả trị liệu
            </h4>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : data?.result ? (
              <div className="rounded-xl border border-secondary bg-secondary/20 p-4 text-sm leading-relaxed text-foreground whitespace-pre-line">
                {data.result}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                Chưa có ghi chú kết quả cho buổi chăm sóc này.
              </div>
            )}
          </div>

          {Boolean(
            (data as { skinProfile?: { skinType?: string; careGoals?: string; recommendedTreatment?: string } | null })?.skinProfile,
          ) && (() => {
            const profile = (data as { skinProfile?: { skinType?: string; careGoals?: string; recommendedTreatment?: string } }).skinProfile!;
            return (
              <div className="space-y-3 rounded-xl border p-4 bg-card">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
                  Tóm tắt hồ sơ da
                </h4>
                <dl className="space-y-2 text-xs">
                  {profile.skinType && (
                    <div>
                      <dt className="text-muted-foreground">Loại da:</dt>
                      <dd className="font-medium text-foreground">{profile.skinType}</dd>
                    </div>
                  )}
                  {profile.careGoals && (
                    <div>
                      <dt className="text-muted-foreground">Mục tiêu chăm sóc:</dt>
                      <dd className="font-medium text-foreground">{profile.careGoals}</dd>
                    </div>
                  )}
                  {profile.recommendedTreatment && (
                    <div>
                      <dt className="text-muted-foreground">Khuyến nghị:</dt>
                      <dd className="font-medium text-foreground">{profile.recommendedTreatment}</dd>
                    </div>
                  )}
                </dl>
              </div>
            );
          })()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
