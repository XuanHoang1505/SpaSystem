import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorCodeOf, staffErrorCodes } from '@spa/api-client';
import type { StaffDetail } from '@spa/shared-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useServiceSearch } from '@/features/services/hooks/useServiceSearch';
import { vietnamNow } from '@/lib/formatting/vietnamTime';
import { useCreateStaff } from '../hooks/useStaffMutations';
import { createStaffSchema, type CreateStaffFormValues } from '../schemas';

export interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (created: StaffDetail) => void;
}

export function CreateStaffDialog({ open, onOpenChange, onSuccess }: CreateStaffDialogProps) {
  const createMutation = useCreateStaff();
  const [formError, setFormError] = useState<string | null>(null);

  const servicesQuery = useServiceSearch({ pageSize: 100 });
  const activeServices = (servicesQuery.data?.items ?? []).filter((s) => s.status === 'on_sale');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      hireDate: vietnamNow().date,
      specialty: '',
      spaServiceIds: [],
    },
  });

  const selectedServices = watch('spaServiceIds') || [];

  const handleToggleService = (serviceId: string, checked: boolean) => {
    if (checked) {
      setValue('spaServiceIds', [...selectedServices, serviceId]);
    } else {
      setValue(
        'spaServiceIds',
        selectedServices.filter((id) => id !== serviceId),
      );
    }
  };

  const onSubmit = async (values: CreateStaffFormValues) => {
    setFormError(null);
    try {
      const created = await createMutation.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        hireDate: values.hireDate,
        specialty: values.specialty || undefined,
        spaServiceIds: values.spaServiceIds.length > 0 ? values.spaServiceIds : undefined,
      });

      toast.success(
        `Thêm nhân viên thành công. Mật khẩu tạm thời đã được gửi đến email ${created.email}.`,
      );

      reset();
      onOpenChange(false);
      onSuccess?.(created);
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === staffErrorCodes.EMAIL_ALREADY_EXISTS) {
        setFormError('Email này đã được sử dụng bởi một tài khoản khác trong hệ thống.');
      } else if (code === staffErrorCodes.PHONE_ALREADY_EXISTS) {
        setFormError('Số điện thoại này đã được sử dụng bởi một tài khoản khác.');
      } else {
        setFormError(
          err instanceof Error
            ? err.message
            : 'Đã xảy ra lỗi khi thêm nhân viên. Vui lòng kiểm tra lại.',
        );
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm nhân viên mới</DialogTitle>
          <DialogDescription>
            Tạo tài khoản nhân viên. Mật khẩu tạm thời sẽ được tạo và gửi tự động qua email.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="create-staff-fullName">
              Họ và tên <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-staff-fullName"
              placeholder="Ví dụ: Nguyễn Thị Hoa"
              {...register('fullName')}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="create-staff-email">
                Email đăng nhập <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-staff-email"
                type="email"
                placeholder="staff@example.com"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="create-staff-phone">
                Số điện thoại <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-staff-phone"
                placeholder="0912345678"
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Hire Date */}
            <div className="space-y-1.5">
              <Label htmlFor="create-staff-hireDate">
                Ngày vào làm <span className="text-destructive">*</span>
              </Label>
              <Input id="create-staff-hireDate" type="date" {...register('hireDate')} />
              {errors.hireDate && (
                <p className="text-xs text-destructive">{errors.hireDate.message}</p>
              )}
            </div>

            {/* Specialty */}
            <div className="space-y-1.5">
              <Label htmlFor="create-staff-specialty">Chuyên môn</Label>
              <Input
                id="create-staff-specialty"
                placeholder="Chăm sóc da chuyên sâu, Massage..."
                {...register('specialty')}
              />
              {errors.specialty && (
                <p className="text-xs text-destructive">{errors.specialty.message}</p>
              )}
            </div>
          </div>

          {/* Assigned Services */}
          <div className="space-y-2 pt-1">
            <Label>Dịch vụ phụ trách (có thể chọn sau)</Label>
            <div className="max-h-40 space-y-2 divide-y overflow-y-auto rounded-lg border bg-card/40 p-3">
              {activeServices.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Không có dịch vụ nào đang mở bán.
                </p>
              ) : (
                activeServices.map((svc) => (
                  <label
                    key={svc.id}
                    className="flex cursor-pointer items-center gap-2.5 pt-2 text-sm first:pt-0"
                  >
                    <Checkbox
                      checked={selectedServices.includes(svc.id)}
                      onCheckedChange={(checked) => handleToggleService(svc.id, Boolean(checked))}
                    />
                    <span className="flex-1 font-medium">{svc.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo nhân viên'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
