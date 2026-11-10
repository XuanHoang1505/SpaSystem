import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorCodeOf, staffErrorCodes } from '@spa/api-client';
import type { StaffDetail, StaffListItem } from '@spa/shared-types';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useUpdateStaff } from '../hooks/useStaffMutations';
import { updateStaffSchema, type UpdateStaffFormValues } from '../schemas';

export interface EditStaffDialogProps {
  staff: StaffListItem | StaffDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: StaffDetail) => void;
}

export function EditStaffDialog({ staff, open, onOpenChange, onSuccess }: EditStaffDialogProps) {
  const updateMutation = useUpdateStaff();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateStaffFormValues>({
    resolver: zodResolver(updateStaffSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      hireDate: '',
      specialty: '',
    },
  });

  useEffect(() => {
    if (staff) {
      reset({
        fullName: staff.fullName,
        phoneNumber: staff.phoneNumber,
        hireDate: staff.hireDate,
        specialty: staff.specialty ?? '',
      });
      setFormError(null);
    }
  }, [staff, reset]);

  const onSubmit = async (values: UpdateStaffFormValues) => {
    if (!staff) return;
    setFormError(null);
    try {
      const updated = await updateMutation.mutateAsync({
        id: staff.id,
        body: {
          fullName: values.fullName,
          phoneNumber: values.phoneNumber,
          hireDate: values.hireDate,
          specialty: values.specialty || undefined,
        },
      });

      toast.success(`Thông tin của nhân viên ${updated.fullName} đã được cập nhật.`);

      onOpenChange(false);
      onSuccess?.(updated);
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === staffErrorCodes.PHONE_ALREADY_EXISTS) {
        setFormError('Số điện thoại này đã được sử dụng bởi một tài khoản khác.');
      } else if (code === staffErrorCodes.HIRE_DATE_AFTER_SHIFT) {
        setFormError('Nhân viên đã có ca làm việc, ngày vào làm không được sau ngày có ca làm.');
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Đã xảy ra lỗi khi cập nhật thông tin nhân viên.',
        );
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa thông tin nhân viên</DialogTitle>
          <DialogDescription>
            Cập nhật họ tên, số điện thoại, ngày vào làm hoặc chuyên môn.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Readonly Email */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-email">Email đăng nhập</Label>
            <Input
              id="edit-staff-email"
              value={staff?.email ?? ''}
              disabled
              className="cursor-not-allowed bg-muted text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground">Email đăng nhập không thể thay đổi.</p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-fullName">
              Họ và tên <span className="text-destructive">*</span>
            </Label>
            <Input id="edit-staff-fullName" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-phone">
              Số điện thoại <span className="text-destructive">*</span>
            </Label>
            <Input id="edit-staff-phone" {...register('phoneNumber')} />
            {errors.phoneNumber && (
              <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>
            )}
          </div>

          {/* Hire Date */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-hireDate">
              Ngày vào làm <span className="text-destructive">*</span>
            </Label>
            <Input id="edit-staff-hireDate" type="date" {...register('hireDate')} />
            {errors.hireDate && (
              <p className="text-xs text-destructive">{errors.hireDate.message}</p>
            )}
          </div>

          {/* Specialty */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-specialty">Chuyên môn</Label>
            <Input
              id="edit-staff-specialty"
              placeholder="Chăm sóc da, Massage bấm huyệt..."
              {...register('specialty')}
            />
            {errors.specialty && (
              <p className="text-xs text-destructive">{errors.specialty.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
