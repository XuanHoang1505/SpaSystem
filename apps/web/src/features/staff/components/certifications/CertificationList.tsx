import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AwardIcon,
  CheckIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { staffQueryKeys } from '@spa/api-client';
import type { StaffCertification } from '@spa/shared-types';
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
import { formatLocalDate } from '@/lib/formatting/formatters';
import { certificationReviewBadge, certificationValidityBadge } from '../../certificationStatus';
import {
  useReviewCertification,
  type CertificationActions,
} from '../../hooks/useStaffCertifications';
import { CertificationDialog, type CertificationDialogTarget } from './CertificationDialog';
import { CertificationImage } from './CertificationImage';
import { RejectCertificationDialog } from './RejectCertificationDialog';
import { reviewErrorMessage } from './reviewErrors';

type ListQuery = {
  data: readonly StaffCertification[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => unknown;
};

/**
 * The certifications of one staff member as cards. `owner` can verify and reject; `self` (the staff member) cannot,
 * and cannot delete a verified one (BR-STF-14).
 */
export function CertificationList({
  mode,
  staffMemberId,
  query,
  actions,
  canWrite = true,
}: {
  mode: 'owner' | 'self';
  staffMemberId: string;
  query: ListQuery;
  actions: CertificationActions;
  canWrite?: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CertificationDialogTarget | null>(null);
  const [deleting, setDeleting] = useState<StaffCertification | null>(null);
  const [rejecting, setRejecting] = useState<StaffCertification | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const review = useReviewCertification(staffMemberId);
  const isOwner = mode === 'owner';
  const reload = () => void queryClient.invalidateQueries({ queryKey: staffQueryKeys.all });

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await actions.remove(deleting.id);
      toast.success('Đã xóa bằng cấp.');
    } catch (error) {
      toast.error(reviewErrorMessage(error));
    } finally {
      setDeletePending(false);
      setDeleting(null);
    }
  };

  const verify = (certification: StaffCertification) =>
    review.mutate(
      { id: certification.id },
      {
        onSuccess: () => toast.success('Đã duyệt bằng.'),
        onError: (error) => toast.error(reviewErrorMessage(error)),
      },
    );

  return (
    <section aria-labelledby="certifications-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4
          id="certifications-title"
          className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Bằng cấp & chứng chỉ ({query.data?.length ?? 0})
        </h4>
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setEditing({ certification: null })}>
            <PlusIcon aria-hidden="true" />
            Thêm bằng
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <div className="space-y-2" aria-label="Đang tải bằng cấp">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Không tải được bằng cấp"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          className="py-6"
        />
      ) : !query.data || query.data.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <AwardIcon className="size-4" aria-hidden="true" />
          Chưa ghi nhận bằng cấp nào.
        </p>
      ) : (
        <ul className="grid gap-2">
          {query.data.map((certification) => {
            const validity = certificationValidityBadge(certification.status);
            const reviewBadge = certificationReviewBadge(certification.verificationStatus);
            const verified = certification.verificationStatus === 'verified';
            const canDelete = isOwner || !verified;
            return (
              <li key={certification.id} className="space-y-2 rounded-xl border bg-card/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium break-words text-foreground">{certification.name}</p>
                    {(certification.issuer || certification.credentialNumber) && (
                      <p className="text-xs text-muted-foreground">
                        {[
                          certification.issuer,
                          certification.credentialNumber &&
                            `Số hiệu ${certification.credentialNumber}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {[
                        certification.issuedOn &&
                          `Cấp ngày ${formatLocalDate(certification.issuedOn)}`,
                        certification.expiresOn
                          ? `Hết hạn ${formatLocalDate(certification.expiresOn)}`
                          : 'Không thời hạn',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Sửa bằng ${certification.name}`}
                        onClick={() => setEditing({ certification })}
                      >
                        <PencilIcon aria-hidden="true" />
                      </Button>
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Xóa bằng ${certification.name}`}
                          onClick={() => setDeleting(certification)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2Icon aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge label={validity.label} tone={validity.tone} />
                  <StatusBadge label={reviewBadge.label} tone={reviewBadge.tone} />
                  {!certification.isPublic && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <EyeOffIcon className="size-3.5" aria-hidden="true" />
                      Ẩn với khách
                    </span>
                  )}
                </div>

                <CertificationImage
                  certification={certification}
                  actions={actions}
                  canWrite={canWrite}
                  isOwner={isOwner}
                />

                {certification.verificationStatus === 'rejected' &&
                  certification.rejectionReason && (
                    <p className="text-xs text-destructive">{`Lý do từ chối: ${certification.rejectionReason}`}</p>
                  )}
                {isOwner && certification.note && (
                  <p className="text-xs text-muted-foreground">{`Ghi chú: ${certification.note}`}</p>
                )}
                {!isOwner && verified && (
                  <p className="text-xs text-muted-foreground">
                    Đã duyệt, liên hệ chủ spa nếu cần xóa.
                  </p>
                )}

                {isOwner && canWrite && !verified && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      aria-label={`Duyệt bằng ${certification.name}`}
                      onClick={() => verify(certification)}
                      loading={review.isPending && review.variables?.id === certification.id}
                    >
                      <CheckIcon aria-hidden="true" />
                      Duyệt
                    </Button>
                    {certification.verificationStatus === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Từ chối bằng ${certification.name}`}
                        onClick={() => setRejecting(certification)}
                      >
                        <XIcon aria-hidden="true" />
                        Từ chối
                      </Button>
                    )}
                  </div>
                )}
                {isOwner && canWrite && verified && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto px-0 text-xs text-muted-foreground"
                      onClick={() => setRejecting(certification)}
                    >
                      Từ chối bằng này
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <CertificationDialog
        target={editing}
        actions={actions}
        reviewNotice={
          isOwner
            ? undefined
            : 'Bằng bạn thêm hoặc sửa sẽ chờ chủ spa duyệt trước khi hiển thị cho khách.'
        }
        onClose={() => setEditing(null)}
        onMissing={reload}
      />
      {isOwner && (
        <RejectCertificationDialog
          staffMemberId={staffMemberId}
          certification={rejecting}
          onClose={() => setRejecting(null)}
        />
      )}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Xóa bằng ${deleting?.name ?? ''}?`}</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xóa khi ghi nhầm.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
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
