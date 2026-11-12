import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangleIcon, UserIcon } from 'lucide-react';
import { errorCodeOf, staffErrorCodes } from '@spa/api-client';
import type { AppointmentToReassign, StaffDetail, StaffListItem } from '@spa/shared-types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamNow } from '@/lib/formatting/vietnamTime';
import { useResignStaff } from '../hooks/useStaffMutations';
import { resignStaffSchema, type ResignStaffFormValues } from '../schemas';

export interface ResignStaffDialogProps {
  staff: StaffListItem | StaffDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (reassigns: readonly AppointmentToReassign[]) => void;
}

export function ResignStaffDialog({
  staff,
  open,
  onOpenChange,
  onSuccess,
}: ResignStaffDialogProps) {
  const resignMutation = useResignStaff();
  const [error, setError] = useState<string | null>(null);
  const [reassignList, setReassignList] = useState<readonly AppointmentToReassign[] | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResignStaffFormValues>({
    resolver: zodResolver(resignStaffSchema),
    defaultValues: {
      resignationDate: vietnamNow().date,
    },
  });

  const handleClose = () => {
    reset();
    setError(null);
    setReassignList(null);
    onOpenChange(false);
  };

  const onSubmit = async (values: ResignStaffFormValues) => {
    if (!staff) return;
    setError(null);

    try {
      const result = await resignMutation.mutateAsync({
        id: staff.id,
        body: { resignationDate: values.resignationDate },
      });

      toast.success(
        `Nhân viên ${staff.fullName} đã được ghi nhận nghỉ việc từ ngày ${formatLocalDate(values.resignationDate)}.`,
      );

      if (result.appointmentsToReassign && result.appointmentsToReassign.length > 0) {
        setReassignList(result.appointmentsToReassign);
        onSuccess?.(result.appointmentsToReassign);
      } else {
        handleClose();
        onSuccess?.([]);
      }
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === staffErrorCodes.STAFF_ALREADY_RESIGNED) {
        setError('Nhân viên này đã được ghi nhận nghỉ việc trước đó.');
      } else if (code === staffErrorCodes.RESIGNATION_BEFORE_HIRE_DATE) {
        setError('Ngày nghỉ việc không được trước ngày vào làm của nhân viên.');
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Đã xảy ra lỗi khi ghi nhận nghỉ việc cho nhân viên.',
        );
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="size-5" />
            Ghi nhận nhân viên nghỉ việc
          </DialogTitle>
          <DialogDescription>
            Xác nhận cho nhân viên <strong className="text-foreground">{staff?.fullName}</strong>{' '}
            nghỉ việc.
          </DialogDescription>
        </DialogHeader>

        {reassignList ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangleIcon className="size-4" />
              <AlertTitle>Cần gán lại nhân viên ({reassignList.length} lịch hẹn)</AlertTitle>
              <AlertDescription className="text-xs">
                Các lịch hẹn sau đây đang được phân công cho nhân viên này từ ngày nghỉ việc trở đi.
                Vui lòng vào trang Quản lý lịch hẹn để phân công lại cho nhân viên khác.
              </AlertDescription>
            </Alert>

            <div className="max-h-60 divide-y overflow-y-auto rounded-xl border bg-card/60 p-2 text-xs">
              {reassignList.map((app) => (
                <div key={app.id} className="space-y-1 p-2">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1 text-foreground">
                      <UserIcon className="size-3.5 text-muted-foreground" />
                      {app.customerName}
                    </span>
                    <span className="text-muted-foreground">
                      {formatLocalDate(app.date)} ({app.startTime} – {app.endTime})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Đã hiểu và hoàn tất</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-muted-foreground">
              <p className="font-semibold text-destructive">Lưu ý quan trọng:</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Tài khoản nhân viên sẽ chuyển sang trạng thái vô hiệu hóa.</li>
                <li>Tất cả các ca làm việc của nhân viên từ ngày nghỉ việc sẽ bị hủy.</li>
                <li>Hệ thống sẽ kiểm tra các lịch hẹn đang được phân công cho nhân viên này.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resign-staff-date">
                Ngày nghỉ việc <span className="text-destructive">*</span>
              </Label>
              <Input id="resign-staff-date" type="date" {...register('resignationDate')} />
              {errors.resignationDate && (
                <p className="text-xs text-destructive">{errors.resignationDate.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={resignMutation.isPending}
              >
                Hủy
              </Button>
              <Button type="submit" variant="destructive" disabled={resignMutation.isPending}>
                {resignMutation.isPending ? 'Đang xử lý...' : 'Xác nhận nghỉ việc'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
