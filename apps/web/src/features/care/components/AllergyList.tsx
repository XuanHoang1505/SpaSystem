import { useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import type { CustomerAllergy } from '@spa/shared-types';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { allergySeverityBadge } from '@/features/bookings/appointmentStatus';
import { formatDateTimeUtc } from '@/lib/formatting/formatters';
import { careErrorKind, careErrorMessage } from '../errors';
import { useDeleteAllergy } from '../hooks/useCareMutations';
import { useCustomerAllergies } from '../hooks/useCareQueries';
import { AllergyDialog, type AllergyDialogTarget } from './AllergyDialog';
import { NOT_IN_CARE_MESSAGE } from './careMessages';

/** "Dị ứng của khách": cards (a few items with long notes), add/edit in a Dialog, delete behind an AlertDialog. */
export function AllergyList({
  customerId,
  appointmentId,
}: {
  customerId: string;
  appointmentId: string;
}) {
  const query = useCustomerAllergies(customerId);
  const deleteMutation = useDeleteAllergy();
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState<AllergyDialogTarget | null>(null);
  const [deleting, setDeleting] = useState<CustomerAllergy | null>(null);
  const canWrite = !forbidden && careErrorKind(query.error) !== 'not_in_care';

  const confirmDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(
      { customerId, appointmentId, allergyId: deleting.id },
      {
        onSuccess: () => toast.success('Đã xóa dị ứng.'),
        onError: (error) => {
          if (careErrorKind(error) === 'not_in_care') {
            setForbidden(true);
            toast.error(NOT_IN_CARE_MESSAGE);
          } else toast.error(careErrorMessage(error) ?? 'Không xóa được dị ứng, vui lòng thử lại.');
        },
        onSettled: () => setDeleting(null),
      },
    );
  };

  return (
    <section aria-labelledby="customer-allergies-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="customer-allergies-title" className="font-heading text-base font-semibold">
          Dị ứng của khách
        </h2>
        {canWrite && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing({ customerId, appointmentId, allergy: null })}
          >
            <PlusIcon aria-hidden="true" />
            Thêm dị ứng
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <div className="space-y-2" aria-label="Đang tải dị ứng">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : query.isError ? (
        careErrorKind(query.error) === 'not_in_care' ? (
          <p className="text-sm text-muted-foreground">{NOT_IN_CARE_MESSAGE}</p>
        ) : (
          <ErrorState
            title="Không tải được danh sách dị ứng"
            message={careErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
            className="py-6"
          />
        )
      ) : !query.data || query.data.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Chưa ghi nhận dị ứng nào.
        </p>
      ) : (
        <ul className="grid gap-2">
          {query.data.map((allergy) => {
            const badge = allergySeverityBadge(allergy.severity);
            return (
              <li
                key={allergy.id}
                className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{allergy.allergen}</span>
                    <StatusBadge label={badge.label} tone={badge.tone} />
                  </div>
                  {allergy.note && (
                    <p className="text-sm break-words text-muted-foreground">{allergy.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {`Ghi nhận ${formatDateTimeUtc(allergy.recordedAtUtc)}`}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Sửa dị ứng ${allergy.allergen}`}
                      onClick={() => setEditing({ customerId, appointmentId, allergy })}
                    >
                      <PencilIcon aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Xóa dị ứng ${allergy.allergen}`}
                      onClick={() => setDeleting(allergy)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AllergyDialog
        target={editing}
        onClose={() => setEditing(null)}
        onForbidden={() => setForbidden(true)}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Xóa dị ứng ${deleting?.allergen ?? ''}?`}</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xóa khi ghi nhầm.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
