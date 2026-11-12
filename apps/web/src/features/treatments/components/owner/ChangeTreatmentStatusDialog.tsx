import { useEffect, useMemo, useState } from 'react';
import { AlertCircleIcon, AlertTriangleIcon, CheckCircle2Icon, PauseIcon, PlayIcon, XCircleIcon } from 'lucide-react';
import { errorCodeOf } from '@spa/api-client';
import type { TreatmentPlanDto, TreatmentPlanListItemDto } from '@spa/shared-types';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useCancelTreatment,
  useCompleteTreatment,
  usePauseTreatment,
  useResumeTreatment,
} from '../../hooks/useOwnerTreatmentMutations';

export type StatusTargetAction = 'pause' | 'resume' | 'cancel' | 'complete';

export interface ChangeTreatmentStatusDialogProps {
  treatment: TreatmentPlanDto | TreatmentPlanListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangeTreatmentStatusDialog({
  treatment,
  open,
  onOpenChange,
  onSuccess,
}: ChangeTreatmentStatusDialogProps) {
  const pauseMutation = usePauseTreatment();
  const resumeMutation = useResumeTreatment();
  const cancelMutation = useCancelTreatment();
  const completeMutation = useCompleteTreatment();

  const [activeAction, setActiveAction] = useState<StatusTargetAction>('pause');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Available target actions based on current status (BR-TRT-08)
  const availableActions = useMemo<StatusTargetAction[]>(() => {
    if (!treatment) return [];
    if (treatment.status === 'paused') {
      return ['resume', 'cancel', 'complete'];
    }
    if (treatment.status === 'not_started' || treatment.status === 'in_progress') {
      return ['pause', 'cancel'];
    }
    return [];
  }, [treatment]);

  useEffect(() => {
    if (open && treatment) {
      setReason('');
      setReasonError(null);
      setFormError(null);
      if (treatment.status === 'paused') {
        setActiveAction('resume');
      } else {
        setActiveAction('pause');
      }
    }
  }, [open, treatment]);

  if (!treatment) return null;

  // Check preconditions (BR-TRT-08)
  const hasBookedSessions = treatment.bookedSessions > 0;

  // Check complete preconditions
  const fullPlan = treatment as TreatmentPlanDto;
  const hasIncompleteSessions = fullPlan.sessions
    ? fullPlan.sessions.some((s) => s.status === 'not_booked' || s.status === 'booked')
    : treatment.bookedSessions > 0 || treatment.usedSessions < treatment.totalSessions;

  const isSubmitting =
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    cancelMutation.isPending ||
    completeMutation.isPending;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setReasonError(null);

    // Validate reason for pause and cancel
    if (activeAction === 'pause' || activeAction === 'cancel') {
      const trimmed = reason.trim();
      if (!trimmed) {
        setReasonError('Vui lòng nhập lý do.');
        return;
      }
      if (trimmed.length > 500) {
        setReasonError('Lý do tối đa 500 ký tự.');
        return;
      }
    }

    try {
      if (activeAction === 'pause') {
        await pauseMutation.mutateAsync({
          id: treatment.id,
          body: { reason: reason.trim() },
        });
        toast.success('Đã tạm dừng liệu trình.');
      } else if (activeAction === 'resume') {
        await resumeMutation.mutateAsync(treatment.id);
        toast.success('Đã tiếp tục liệu trình.');
      } else if (activeAction === 'cancel') {
        if (hasBookedSessions) {
          setFormError(
            'Không thể hủy liệu trình khi còn lịch hẹn đã đặt. Vui lòng hủy các lịch hẹn trước.',
          );
          return;
        }
        await cancelMutation.mutateAsync({
          id: treatment.id,
          body: { reason: reason.trim() },
        });
        toast.success('Đã hủy liệu trình.');
      } else if (activeAction === 'complete') {
        if (hasIncompleteSessions) {
          setFormError(
            'Liệu trình vẫn còn buổi chưa thực hiện hoặc chưa hoàn thành. Tất cả các buổi trong phác đồ phải hoàn thành hoặc bỏ qua trước khi kết thúc liệu trình.',
          );
          return;
        }
        await completeMutation.mutateAsync(treatment.id);
        toast.success('Đã hoàn tất liệu trình.');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === 'treatment_has_booked_sessions') {
        setFormError(
          'Không thể hủy liệu trình khi còn lịch hẹn đã đặt. Vui lòng hủy các lịch hẹn của liệu trình này trước.',
        );
      } else if (code === 'treatment_sessions_remaining') {
        setFormError(
          'Liệu trình vẫn còn buổi chưa thực hiện hoặc chưa đặt lịch. Chỉ có thể đóng khi tất cả các buổi đã hoàn thành hoặc bỏ qua.',
        );
      } else if (code === 'treatment_status_invalid') {
        setFormError('Trạng thái liệu trình không hợp lệ để thực hiện thao tác này.');
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Đã xảy ra lỗi khi chuyển trạng thái liệu trình.');
      }
    }
  };

  const isActionDisabled =
    (activeAction === 'cancel' && hasBookedSessions) ||
    (activeAction === 'complete' && hasIncompleteSessions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển trạng thái liệu trình</DialogTitle>
          <DialogDescription>
            {treatment.packageName} — {treatment.customer.fullName}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" aria-hidden="true" />
            <AlertDescription className="text-xs">{formError}</AlertDescription>
          </Alert>
        )}

        {availableActions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Liệu trình ở trạng thái hoàn thành hoặc đã hủy, không thể thay đổi trạng thái.
          </p>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <Tabs
              value={activeAction}
              onValueChange={(val) => {
                setActiveAction(val as StatusTargetAction);
                setReasonError(null);
                setFormError(null);
              }}
            >
              <TabsList className="grid w-full grid-cols-2 data-[count='3']:grid-cols-3" data-count={availableActions.length}>
                {availableActions.includes('pause') && (
                  <TabsTrigger value="pause" className="gap-1.5 text-xs">
                    <PauseIcon className="size-3.5" aria-hidden="true" />
                    Tạm dừng
                  </TabsTrigger>
                )}
                {availableActions.includes('resume') && (
                  <TabsTrigger value="resume" className="gap-1.5 text-xs">
                    <PlayIcon className="size-3.5" aria-hidden="true" />
                    Tiếp tục
                  </TabsTrigger>
                )}
                {availableActions.includes('cancel') && (
                  <TabsTrigger value="cancel" className="gap-1.5 text-xs">
                    <XCircleIcon className="size-3.5" aria-hidden="true" />
                    Hủy liệu trình
                  </TabsTrigger>
                )}
                {availableActions.includes('complete') && (
                  <TabsTrigger value="complete" className="gap-1.5 text-xs">
                    <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                    Đóng hoàn tất
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Action Details */}
              <TabsContent value="pause" className="space-y-3 pt-2">
                <Alert className="border-warning/30 bg-warning/5 text-xs">
                  <AlertCircleIcon className="size-4 text-warning" aria-hidden="true" />
                  <AlertDescription>
                    Khi tạm dừng, các lịch hẹn đã đặt vẫn được diễn ra bình thường, nhưng khách hàng
                    sẽ không thể tự đặt thêm buổi mới.
                  </AlertDescription>
                </Alert>

                <div className="space-y-1.5">
                  <Label htmlFor="pause-reason">
                    Lý do tạm dừng <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="pause-reason"
                    rows={3}
                    placeholder="Nhập lý do tạm dừng liệu trình (bắt buộc, 1–500 ký tự)..."
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (reasonError) setReasonError(null);
                    }}
                  />
                  {reasonError && <p className="text-xs text-destructive">{reasonError}</p>}
                </div>
              </TabsContent>

              <TabsContent value="resume" className="space-y-3 pt-2">
                <Alert className="border-info/30 bg-info/5 text-xs">
                  <CheckCircle2Icon className="size-4 text-info" aria-hidden="true" />
                  <AlertDescription>
                    Mở lại liệu trình cho khách hàng tiếp tục đặt lịch hẹn. Trạng thái sẽ trở về &quot;Đang
                    thực hiện&quot; (hoặc &quot;Chưa bắt đầu&quot; nếu chưa có buổi nào hoàn thành).
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="cancel" className="space-y-3 pt-2">
                {hasBookedSessions ? (
                  <Alert variant="destructive">
                    <AlertTriangleIcon className="size-4" aria-hidden="true" />
                    <AlertTitle className="text-xs font-semibold">Chưa thể hủy liệu trình</AlertTitle>
                    <AlertDescription className="text-xs">
                      Liệu trình còn lịch hẹn đã đặt ({treatment.bookedSessions} buổi). Vui lòng hủy các
                      lịch hẹn trước khi hủy liệu trình.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 text-xs">
                    <AlertTriangleIcon className="size-4 text-destructive" aria-hidden="true" />
                    <AlertDescription>
                      Hủy bỏ toàn bộ liệu trình. Khách hàng sẽ không thể tiếp tục đặt lịch hẹn cho gói này.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="cancel-reason">
                    Lý do hủy liệu trình <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="cancel-reason"
                    rows={3}
                    placeholder="Nhập lý do hủy liệu trình (bắt buộc, 1–500 ký tự)..."
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (reasonError) setReasonError(null);
                    }}
                    disabled={hasBookedSessions}
                  />
                  {reasonError && <p className="text-xs text-destructive">{reasonError}</p>}
                </div>
              </TabsContent>

              <TabsContent value="complete" className="space-y-3 pt-2">
                {hasIncompleteSessions ? (
                  <Alert variant="destructive">
                    <AlertTriangleIcon className="size-4" aria-hidden="true" />
                    <AlertTitle className="text-xs font-semibold">Chưa thể đóng liệu trình</AlertTitle>
                    <AlertDescription className="text-xs">
                      Liệu trình vẫn còn buổi chưa thực hiện hoặc chưa đặt lịch. Chỉ có thể đóng khi tất
                      cả các buổi đã hoàn thành hoặc bỏ qua.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-success/30 bg-success/5 text-xs">
                    <CheckCircle2Icon className="size-4 text-success" aria-hidden="true" />
                    <AlertDescription>
                      Tất cả các buổi trong phác đồ đã được hoàn thành hoặc bỏ qua. Xác nhận đóng hoàn tất liệu trình.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant={activeAction === 'cancel' ? 'destructive' : 'default'}
                disabled={isSubmitting || isActionDisabled}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
