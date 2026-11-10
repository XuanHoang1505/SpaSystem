import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { WorkScheduleBatchResult } from '@spa/shared-types';
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
import { useWorkingStaff } from '@/features/bookings/hooks/owner/useWorkingStaff';
import { addDays, vietnamNow } from '@/lib/formatting/vietnamTime';
import { useCreateBatchShifts } from '../hooks/useWorkScheduleMutations';
import { weekdayLabels } from '../scheduleUtils';
import { createBatchShiftsSchema, type CreateBatchShiftsFormValues } from '../schemas';

export interface CreateBatchShiftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchComplete: (result: WorkScheduleBatchResult) => void;
}

export function CreateBatchShiftsDialog({
  open,
  onOpenChange,
  onBatchComplete,
}: CreateBatchShiftsDialogProps) {
  const createBatchMutation = useCreateBatchShifts();
  const staffQuery = useWorkingStaff();
  const staffMembers = staffQuery.data?.items ?? [];
  const [error, setError] = useState<string | null>(null);

  const today = vietnamNow().date;
  const defaultToDate = addDays(today, 6); // 1 week

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBatchShiftsFormValues>({
    resolver: zodResolver(createBatchShiftsSchema),
    defaultValues: {
      staffMemberIds: [],
      fromDate: today,
      toDate: defaultToDate,
      weekdays: [1, 2, 3, 4, 5, 6, 0], // all days
      startTime: '08:00',
      endTime: '17:00',
    },
  });

  const selectedStaffIds = watch('staffMemberIds') || [];
  const selectedWeekdays = watch('weekdays') || [];

  const handleToggleStaff = (id: string, checked: boolean) => {
    if (checked) {
      setValue('staffMemberIds', [...selectedStaffIds, id], { shouldValidate: true });
    } else {
      setValue(
        'staffMemberIds',
        selectedStaffIds.filter((item) => item !== id),
        { shouldValidate: true },
      );
    }
  };

  const handleSelectAllStaff = () => {
    setValue(
      'staffMemberIds',
      staffMembers.map((s) => s.id),
      { shouldValidate: true },
    );
  };

  const handleClearAllStaff = () => {
    setValue('staffMemberIds', [], { shouldValidate: true });
  };

  const handleToggleWeekday = (day: number, checked: boolean) => {
    if (checked) {
      setValue('weekdays', [...selectedWeekdays, day], { shouldValidate: true });
    } else {
      setValue(
        'weekdays',
        selectedWeekdays.filter((d) => d !== day),
        { shouldValidate: true },
      );
    }
  };

  const onSubmit = async (values: CreateBatchShiftsFormValues) => {
    setError(null);
    try {
      const result = await createBatchMutation.mutateAsync({
        staffMemberIds: values.staffMemberIds,
        fromDate: values.fromDate,
        toDate: values.toDate,
        weekdays: values.weekdays,
        startTime: values.startTime,
        endTime: values.endTime,
      });

      reset();
      onOpenChange(false);
      onBatchComplete(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi phân ca hàng loạt.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Phân ca làm việc hàng loạt</DialogTitle>
          <DialogDescription>
            Tạo ca làm cho nhiều nhân viên trong một khoảng ngày theo các thứ trong tuần. Các ca
            không hợp lệ sẽ tự động được bỏ qua và báo cáo lại.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Staff Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Label>
                Chọn nhân viên <span className="text-destructive">*</span> (
                {selectedStaffIds.length}/{staffMembers.length})
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleSelectAllStaff}
                  className="h-auto p-0 text-xs"
                >
                  Chọn tất cả
                </Button>
                <span className="text-muted-foreground">•</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleClearAllStaff}
                  className="h-auto p-0 text-xs text-muted-foreground"
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>

            <div className="max-h-36 space-y-1.5 divide-y overflow-y-auto rounded-lg border bg-card/40 p-2.5">
              {staffMembers.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2.5 pt-1.5 text-xs first:pt-0"
                >
                  <Checkbox
                    checked={selectedStaffIds.includes(s.id)}
                    onCheckedChange={(checked) => handleToggleStaff(s.id, Boolean(checked))}
                  />
                  <span className="font-medium text-foreground">{s.fullName}</span>
                </label>
              ))}
            </div>
            {errors.staffMemberIds && (
              <p className="text-xs text-destructive">{errors.staffMemberIds.message}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="batch-from-date">
                Từ ngày <span className="text-destructive">*</span>
              </Label>
              <Input id="batch-from-date" type="date" {...register('fromDate')} />
              {errors.fromDate && (
                <p className="text-xs text-destructive">{errors.fromDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-to-date">
                Đến ngày <span className="text-destructive">*</span>
              </Label>
              <Input id="batch-to-date" type="date" {...register('toDate')} />
              {errors.toDate && <p className="text-xs text-destructive">{errors.toDate.message}</p>}
            </div>
          </div>

          {/* Weekdays */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Label>
                Thứ áp dụng trong tuần <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setValue('weekdays', [1, 2, 3, 4, 5], { shouldValidate: true })}
                  className="h-auto p-0 text-xs"
                >
                  T2–T6
                </Button>
                <span className="text-muted-foreground">•</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() =>
                    setValue('weekdays', [1, 2, 3, 4, 5, 6, 0], { shouldValidate: true })
                  }
                  className="h-auto p-0 text-xs"
                >
                  Cả tuần
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {weekdayLabels.map(({ day, label }) => {
                const isSelected = selectedWeekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleWeekday(day, !isSelected)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.weekdays && (
              <p className="text-xs text-destructive">{errors.weekdays.message}</p>
            )}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="batch-startTime">
                Giờ bắt đầu <span className="text-destructive">*</span>
              </Label>
              <Input id="batch-startTime" type="time" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-xs text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-endTime">
                Giờ kết thúc <span className="text-destructive">*</span>
              </Label>
              <Input id="batch-endTime" type="time" {...register('endTime')} />
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
              disabled={createBatchMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={createBatchMutation.isPending}>
              {createBatchMutation.isPending ? 'Đang tạo...' : 'Tạo hàng loạt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
