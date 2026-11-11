import { useEffect, useState } from 'react';
import { errorCodeOf } from '@spa/api-client';
import type { TreatmentPlanDto, TreatmentPlanListItemDto } from '@spa/shared-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStaffList } from '@/features/staff';
import { toast } from 'sonner';
import { useAssignTreatmentStaff } from '../../hooks/useOwnerTreatmentMutations';

export interface AssignTreatmentStaffDialogProps {
  treatment: TreatmentPlanDto | TreatmentPlanListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AssignTreatmentStaffDialog({
  treatment,
  open,
  onOpenChange,
  onSuccess,
}: AssignTreatmentStaffDialogProps) {
  const staffQuery = useStaffList({ status: 'working' });
  const workingStaff = staffQuery.data?.items ?? [];
  const assignMutation = useAssignTreatmentStaff();

  const [selectedStaffId, setSelectedStaffId] = useState<string>('none');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (treatment && open) {
      setSelectedStaffId(treatment.primaryStaff?.id ?? 'none');
      setFormError(null);
    }
  }, [treatment, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!treatment) return;
    setFormError(null);

    const staffMemberId = selectedStaffId === 'none' ? null : selectedStaffId;

    try {
      await assignMutation.mutateAsync({
        id: treatment.id,
        body: { staffMemberId },
      });

      toast.success(
        staffMemberId
          ? 'Đã cập nhật nhân viên phụ trách liệu trình.'
          : 'Đã hủy phân công nhân viên phụ trách.',
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === 'staff_not_found' || code === 'staff_resigned') {
        setFormError('Nhân viên không tồn tại hoặc đã nghỉ việc.');
      } else if (code === 'treatment_status_invalid') {
        setFormError('Không thể phân công nhân viên cho liệu trình đã hoàn thành hoặc đã hủy.');
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Đã xảy ra lỗi khi phân công nhân viên.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phân công kỹ thuật viên phụ trách</DialogTitle>
          <DialogDescription>
            {treatment ? `${treatment.packageName} — ${treatment.customer.fullName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="staff-select">Kỹ thuật viên phụ trách</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger id="staff-select" className="w-full text-sm">
                <SelectValue placeholder="Chọn nhân viên phụ trách" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground italic">
                    Bỏ người phụ trách (để trống)
                  </span>
                </SelectItem>
                {workingStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.fullName} {staff.specialty ? `(${staff.specialty})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Kỹ thuật viên phụ trách sẽ được quyền theo dõi tiến độ, tạo hồ sơ da và cập nhật ghi
              chú cho các buổi trị liệu.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assignMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
