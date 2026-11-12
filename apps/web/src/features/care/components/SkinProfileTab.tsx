import { useState } from 'react';
import { ClipboardPenIcon, PencilIcon } from 'lucide-react';
import type { AppointmentDetail } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { careErrorMessage } from '../errors';
import { useSkinProfile } from '../hooks/useCareQueries';
import { SkinProfileForm, type SkinProfileFormOutcome } from './SkinProfileForm';
import { SkinProfileView } from './SkinProfileView';

/**
 * Tab "Hồ sơ da". Writes show for `confirmed`/`completed` only (status from the server); the date rules
 * (too early, edit window) come back as error codes (docs/specs/care.md, "Không suy luận lại rule").
 */
export function SkinProfileTab({ appointment }: { appointment: AppointmentDetail }) {
  const hasProfile = appointment.skinProfileId !== null;
  const query = useSkinProfile(appointment.id, hasProfile);
  const [editing, setEditing] = useState(false);
  const [locked, setLocked] = useState(false);
  const statusAllows = appointment.status === 'confirmed' || appointment.status === 'completed';
  const canWrite = statusAllows && !locked;

  const onDone = (outcome: SkinProfileFormOutcome) => {
    setEditing(false);
    if (outcome === 'locked') setLocked(true);
  };

  if (editing)
    return (
      <SkinProfileForm
        appointmentId={appointment.id}
        profile={hasProfile ? (query.data ?? null) : null}
        onDone={onDone}
      />
    );

  if (!hasProfile)
    return (
      <EmptyState
        icon={ClipboardPenIcon}
        title="Chưa có hồ sơ da cho buổi này"
        description={
          statusAllows
            ? 'Ghi nhận tình trạng da của khách để các buổi sau chăm sóc đúng hơn.'
            : `Lịch ở trạng thái ${appointmentStatusBadge(appointment.status).label} nên không lập hồ sơ da được.`
        }
        action={
          canWrite && (
            <Button type="button" onClick={() => setEditing(true)}>
              Lập hồ sơ da
            </Button>
          )
        }
      />
    );

  if (query.isLoading)
    return (
      <div className="space-y-2" aria-label="Đang tải hồ sơ da">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );

  if (query.isError || !query.data)
    return (
      <ErrorState
        title="Không tải được hồ sơ da"
        message={careErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <PencilIcon aria-hidden="true" />
            Cập nhật hồ sơ
          </Button>
        </div>
      )}
      <SkinProfileView profile={query.data} />
    </div>
  );
}
