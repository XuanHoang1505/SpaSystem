import type { ReactNode } from 'react';
import {
  CalendarClockIcon,
  ChevronRightIcon,
  ClipboardPenIcon,
  PackageIcon,
  PhoneIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CareHistoryItem } from '@spa/shared-types';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { formatLongDate } from '@/lib/formatting/vietnamTime';
import { careErrorKind, careErrorMessage } from '../../errors';
import { useCareAppointment, useCareHistory, useSkinProfile } from '../../hooks/useCareQueries';
import { AllergyHighlight } from '../AllergyHighlight';
import { SkinProfileView } from '../SkinProfileView';

const OTHER_VISITS = 5;

/** SCR-W28 "Drawer hồ sơ": one completed visit, its skin profile and the other visits with the same customer. */
export function CareVisitSheet({
  visit,
  onClose,
  onOpenVisit,
}: {
  visit: CareHistoryItem | null;
  onClose: () => void;
  onOpenVisit: (visit: CareHistoryItem) => void;
}) {
  return (
    <Sheet open={visit !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetTitle>{visit ? visit.service.name : 'Buổi chăm sóc'}</SheetTitle>
          <SheetDescription>
            {visit
              ? `${formatLongDate(visit.date)} · ${formatLocalTime(visit.startTime)} – ${formatLocalTime(visit.endTime)}`
              : 'Chi tiết buổi chăm sóc'}
          </SheetDescription>
        </SheetHeader>
        {visit && <VisitBody key={visit.appointmentId} visit={visit} onOpenVisit={onOpenVisit} />}
      </SheetContent>
    </Sheet>
  );
}

function VisitBody({
  visit,
  onOpenVisit,
}: {
  visit: CareHistoryItem;
  onOpenVisit: (visit: CareHistoryItem) => void;
}) {
  const appointment = useCareAppointment(visit.appointmentId);
  const session = visit.treatmentSession;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-5">
      <div className="grid gap-2 text-sm">
        <Fact icon={UserIcon}>{visit.customer.fullName}</Fact>
        <Fact icon={PhoneIcon}>
          <a href={`tel:${visit.customer.phoneNumber}`} className="text-primary hover:underline">
            {visit.customer.phoneNumber}
          </a>
        </Fact>
        <Fact icon={CalendarClockIcon}>{formatLongDate(visit.date)}</Fact>
        {session && (
          <Fact icon={PackageIcon}>
            {`Buổi ${session.sequenceNumber}/${session.totalSessions} · ${session.packageName}`}
          </Fact>
        )}
      </div>

      {appointment.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : appointment.isError ? (
        <ErrorState
          title={
            careErrorKind(appointment.error) === 'not_assigned'
              ? 'Lịch này không còn được phân công cho bạn'
              : 'Không tải được buổi chăm sóc'
          }
          message={careErrorMessage(appointment.error)}
          onRetry={() => void appointment.refetch()}
          retrying={appointment.isFetching}
          className="py-6"
        />
      ) : (
        appointment.data && <AllergyHighlight allergies={appointment.data.allergies} />
      )}

      <section aria-labelledby="visit-skin-profile" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="visit-skin-profile" className="font-heading text-base font-semibold">
            Hồ sơ da
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link
              to={`/staff/bookings/${encodeURIComponent(visit.appointmentId)}?tab=skin-profile`}
            >
              <ClipboardPenIcon aria-hidden="true" />
              Lập/cập nhật hồ sơ da
            </Link>
          </Button>
        </div>
        <VisitSkinProfile visit={visit} />
      </section>

      <OtherVisits visit={visit} onOpenVisit={onOpenVisit} />
    </div>
  );
}

function VisitSkinProfile({ visit }: { visit: CareHistoryItem }) {
  const profile = useSkinProfile(visit.appointmentId, visit.skinProfileId !== null);
  if (visit.skinProfileId === null)
    return (
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Buổi này chưa có hồ sơ da.
      </p>
    );
  if (profile.isLoading) return <Skeleton className="h-40 w-full" />;
  if (profile.isError || !profile.data)
    return (
      <ErrorState
        title="Không tải được hồ sơ da"
        onRetry={() => void profile.refetch()}
        retrying={profile.isFetching}
        className="py-6"
      />
    );
  return <SkinProfileView profile={profile.data} />;
}

function OtherVisits({
  visit,
  onOpenVisit,
}: {
  visit: CareHistoryItem;
  onOpenVisit: (visit: CareHistoryItem) => void;
}) {
  const query = useCareHistory({ customerId: visit.customer.id, pageSize: OTHER_VISITS + 1 });
  const others = (query.data?.items ?? [])
    .filter((item) => item.appointmentId !== visit.appointmentId)
    .slice(0, OTHER_VISITS);

  return (
    <section aria-labelledby="visit-others" className="space-y-3">
      <h2 id="visit-others" className="font-heading text-base font-semibold">
        Các lần khác với khách này
      </h2>
      {query.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : query.isError ? (
        <ErrorState
          title="Không tải được các lần chăm sóc khác"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          className="py-6"
        />
      ) : others.length === 0 ? (
        <p className="text-sm text-muted-foreground">Đây là lần đầu bạn chăm sóc khách này.</p>
      ) : (
        <ul className="grid gap-2">
          {others.map((item) => (
            <li key={item.appointmentId}>
              <button
                type="button"
                onClick={() => onOpenVisit(item)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="w-24 shrink-0 text-sm font-semibold">
                  {formatLocalDate(item.date)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{item.service.name}</span>
                {item.skinProfileId && <StatusBadge label="Đã có hồ sơ da" tone="success" />}
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
