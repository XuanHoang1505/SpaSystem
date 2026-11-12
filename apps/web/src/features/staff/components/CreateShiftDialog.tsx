import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorCodeOf, workScheduleErrorCodes } from '@spa/api-client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useWorkingStaff } from '@/features/bookings/hooks/owner/useWorkingStaff';
import { vietnamNow } from '@/lib/formatting/vietnamTime';
import { useCreateShift } from '../hooks/useWorkScheduleMutations';
import { createShiftSchema, type CreateShiftFormValues } from '../schemas';

export interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onSuccess?: () => void;
}

export function CreateShiftDialog({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}: CreateShiftDialogProps) {
  const createMutation = useCreateShift();
  const staffQuery = useWorkingStaff();
  const staffMembers = useMemo(() => staffQuery.data?.items ?? [], [staffQuery.data?.items]);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateShiftFormValues>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      staffMemberId: '',
      date: defaultDate || vietnamNow().date,
      startTime: '08:00',
      endTime: '12:00',
    },
  });

  const selectedStaffId = watch('staffMemberId');

  useEffect(() => {
    if (open) {
      setError(null);
      setValue('date', defaultDate || vietnamNow().date);
      if (staffMembers.length > 0 && !selectedStaffId) {
        setValue('staffMemberId', staffMembers[0]?.id ?? '');
      }
    }
  }, [open, defaultDate, staffMembers, setValue, selectedStaffId]);

  const onSubmit = async (values: CreateShiftFormValues) => {
    setError(null);
    try {
      await createMutation.mutateAsync({
        staffMemberId: values.staffMemberId,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
      });

      toast.success('Phân ca làm việc thành công.');

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === workScheduleErrorCodes.SHIFT_CONFLICT) {
        setError('Ca làm bị chồng giờ với một ca khác của nhân viên này trong ngày.');
      } else if (code === workScheduleErrorCodes.SHIFT_BEFORE_HIRE_DATE) {
        setError('Không thể phân ca trước ngày vào làm của nhân viên.');
      } else if (code === workScheduleErrorCodes.STAFF_RESIGNED) {
        setError('Nhân viên đã nghỉ việc từ ngày này, không thể phân ca.');
      } else if (code === workScheduleErrorCodes.SHIFT_DATE_OUT_OF_RANGE) {
        setError('Chỉ được phân ca từ hôm nay đến 60 ngày tới.');
      } else {
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo ca làm việc.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Phân ca làm việc</DialogTitle>
          <DialogDescription>Tạo một ca làm việc cho nhân viên trong ngày.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Staff Select */}
          <div className="space-y-1.5">
            <Label htmlFor="create-shift-staff">
              Nhân viên <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedStaffId}
              onValueChange={(val) => setValue('staffMemberId', val, { shouldValidate: true })}
            >
              <SelectTrigger id="create-shift-staff">
                <SelectValue placeholder="Chọn nhân viên" />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.staffMemberId && (
              <p className="text-xs text-destructive">{errors.staffMemberId.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="create-shift-date">
              Ngày làm việc <span className="text-destructive">*</span>
            </Label>
            <Input id="create-shift-date" type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-shift-startTime">
                Giờ bắt đầu <span className="text-destructive">*</span>
              </Label>
              <Input id="create-shift-startTime" type="time" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-xs text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-shift-endTime">
                Giờ kết thúc <span className="text-destructive">*</span>
              </Label>
              <Input id="create-shift-endTime" type="time" {...register('endTime')} />
              {errors.endTime && (
                <p className="text-xs text-destructive">{errors.endTime.message}</p>
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
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo ca làm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
