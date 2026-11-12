import type { ReactNode } from 'react';
import {
  CalendarX2Icon,
  CheckCircle2Icon,
  CircleDashedIcon,
  ClipboardCheckIcon,
  ClipboardXIcon,
  HourglassIcon,
  PackageIcon,
  StickyNoteIcon,
  UserXIcon,
  type LucideIcon,
} from 'lucide-react';
import type { AppointmentDetail } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { formatDateTimeUtc } from '@/lib/formatting/formatters';
import { cn } from '@/lib/utils';

const tones = {
  pending: 'bg-accent text-accent-foreground',
  success: 'bg-status-success text-status-success-foreground',
  danger: 'bg-status-danger text-status-danger-foreground',
  neutral: 'bg-muted text-muted-foreground',
} as const;

/** Tab "Kết quả buổi": one card whose header says where the visit stands, by status. */
export function CareResultTab({
  appointment,
  onComplete,
}: {
  appointment: AppointmentDetail;
  onComplete: () => void;
}) {
  const checklist = <VisitChecklist appointment={appointment} />;

  switch (appointment.status) {
    case 'confirmed':
      return (
        <ResultCard
          icon={HourglassIcon}
          tone="pending"
          title="Buổi chưa hoàn thành"
          description="Khi chăm sóc xong, xác nhận để tính buổi này là đã sử dụng."
          action={
            <Button type="button" onClick={onComplete}>
              <CheckCircle2Icon aria-hidden="true" />
              Xác nhận hoàn thành
            </Button>
          }
        >
          {checklist}
        </ResultCard>
      );
    case 'completed':
      return (
        <ResultCard
          icon={CheckCircle2Icon}
          tone="success"
          title="Buổi đã hoàn thành"
          description="Kết quả chăm sóc đã được ghi nhận."
        >
          {checklist}
          <ResultNote
            note={appointment.note}
            hint={
              appointment.treatmentSession
                ? 'Kết quả của buổi trong gói được lưu trong liệu trình của khách.'
                : undefined
            }
          />
        </ResultCard>
      );
    case 'cancelled':
      return (
        <ResultCard
          icon={CalendarX2Icon}
          tone="danger"
          title="Lịch đã hủy"
          description={
            appointment.cancelledAtUtc
              ? `Hủy lúc ${formatDateTimeUtc(appointment.cancelledAtUtc)}.`
              : 'Buổi này không diễn ra.'
          }
        >
          {appointment.cancellationReason && (
            <Quote icon={StickyNoteIcon} label="Lý do hủy" text={appointment.cancellationReason} />
          )}
        </ResultCard>
      );
    case 'no_show':
      return (
        <ResultCard
          icon={UserXIcon}
          tone="danger"
          title="Khách không đến"
          description="Buổi này không có kết quả chăm sóc."
        >
          {appointment.note && (
            <Quote icon={StickyNoteIcon} label="Ghi chú" text={appointment.note} />
          )}
        </ResultCard>
      );
    default:
      return (
        <ResultCard
          icon={CircleDashedIcon}
          tone="neutral"
          title={appointmentStatusBadge(appointment.status).label}
          description="Lịch chưa được xác nhận nên chưa có kết quả buổi."
        />
      );
  }
}

function ResultCard({
  icon: Icon,
  tone,
  title,
  description,
  action,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof tones;
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-4 border-b bg-accent/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn('grid size-11 shrink-0 place-items-center rounded-full', tones[tone])}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children && <div className="space-y-5 p-4 sm:p-5">{children}</div>}
    </section>
  );
}

/** What the visit is and whether a skin profile was written, from the appointment itself. */
function VisitChecklist({ appointment }: { appointment: AppointmentDetail }) {
  const session = appointment.treatmentSession;
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <Fact
        icon={PackageIcon}
        label={session ? 'Buổi trong gói' : 'Dịch vụ lẻ'}
        value={
          session
            ? `Buổi ${session.sequenceNumber}/${session.totalSessions} · ${session.packageName}`
            : appointment.service.name
        }
      />
      <Fact
        icon={appointment.hasSkinProfile ? ClipboardCheckIcon : ClipboardXIcon}
        label="Hồ sơ da"
        value={appointment.hasSkinProfile ? 'Đã lập cho buổi này' : 'Chưa lập'}
        muted={!appointment.hasSkinProfile}
      />
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm', muted ? 'text-muted-foreground italic' : 'text-foreground')}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ResultNote({ note, hint }: { note: string | null; hint?: string }) {
  return (
    <div className="space-y-2">
      {note ? (
        <Quote icon={StickyNoteIcon} label="Ghi chú và kết quả" text={note} />
      ) : (
        <Fact icon={StickyNoteIcon} label="Ghi chú và kết quả" value="Chưa có ghi chú" muted />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Quote({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
  return (
    <figure className="space-y-2 rounded-lg bg-muted/60 p-4">
      <figcaption className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </figcaption>
      <blockquote className="text-sm break-words whitespace-pre-line text-foreground">
        {text}
      </blockquote>
    </figure>
  );
}
