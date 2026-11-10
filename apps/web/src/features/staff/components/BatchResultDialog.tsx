import { CheckCircle2Icon, InfoIcon } from 'lucide-react';
import type { WorkScheduleBatchResult } from '@spa/shared-types';
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
import { formatLocalDate } from '@/lib/formatting/formatters';

export interface BatchResultDialogProps {
  result: WorkScheduleBatchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchResultDialog({ result, open, onOpenChange }: BatchResultDialogProps) {
  if (!result) return null;

  const hasSkipped = result.skipped.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-emerald-600" />
            Kết quả phân ca hàng loạt
          </DialogTitle>
          <DialogDescription>Đã xử lý phân ca làm việc cho danh sách nhân viên.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Summary Box */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <span className="block text-2xl font-bold text-emerald-600">
                {result.created.length}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Ca đã tạo</span>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <span className="block text-2xl font-bold text-amber-600">
                {result.skipped.length}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Ca bị bỏ qua</span>
            </div>
          </div>

          {/* Skipped Shifts List */}
          {hasSkipped && (
            <div className="space-y-2">
              <Alert>
                <InfoIcon className="size-4" />
                <AlertTitle>Chi tiết các ca bị bỏ qua</AlertTitle>
                <AlertDescription className="text-xs">
                  Các ca sau đây không được tạo do xung đột lịch, nhân viên chưa vào làm hoặc đã
                  nghỉ việc:
                </AlertDescription>
              </Alert>

              <div className="max-h-48 divide-y overflow-y-auto rounded-xl border bg-card/60 text-xs">
                {result.skipped.map((skip, idx) => (
                  <div key={idx} className="space-y-0.5 p-2.5">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-foreground">{skip.staffName}</span>
                      <span className="text-muted-foreground">{formatLocalDate(skip.date)}</span>
                    </div>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Lý do: {skip.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button onClick={() => onOpenChange(false)}>Hoàn tất</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
