import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { StaffCertification } from '@spa/shared-types';
import { FormField } from '@/components/shared/FormField/FormField';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useReviewCertification } from '../../hooks/useStaffCertifications';
import { rejectCertificationSchema, type RejectCertificationValues } from '../../schemas';
import { reviewErrorMessage } from './reviewErrors';

/** BR-STF-14: rejecting needs a reason the staff member will read. */
export function RejectCertificationDialog({
  staffMemberId,
  certification,
  onClose,
}: {
  staffMemberId: string;
  certification: StaffCertification | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={certification !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {certification && (
          <RejectForm
            staffMemberId={staffMemberId}
            certification={certification}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RejectForm({
  staffMemberId,
  certification,
  onClose,
}: {
  staffMemberId: string;
  certification: StaffCertification;
  onClose: () => void;
}) {
  const review = useReviewCertification(staffMemberId);
  const form = useForm<RejectCertificationValues>({
    resolver: zodResolver(rejectCertificationSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = form.handleSubmit(({ reason }) =>
    review.mutate(
      { id: certification.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Đã từ chối bằng.');
          onClose();
        },
        onError: (error) => {
          toast.error(reviewErrorMessage(error));
          onClose();
        },
      },
    ),
  );

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{`Từ chối bằng ${certification.name}?`}</DialogTitle>
        <DialogDescription>Nhân viên sẽ thấy lý do và có thể sửa rồi gửi lại.</DialogDescription>
      </DialogHeader>
      <FormField label="Lý do từ chối" required error={form.formState.errors.reason?.message}>
        <Textarea
          rows={3}
          placeholder="Ví dụ: Thông tin không khớp với bản gốc"
          {...form.register('reason')}
        />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={review.isPending}>
          Quay lại
        </Button>
        <Button type="submit" variant="destructive" loading={review.isPending}>
          Từ chối
        </Button>
      </DialogFooter>
    </form>
  );
}
