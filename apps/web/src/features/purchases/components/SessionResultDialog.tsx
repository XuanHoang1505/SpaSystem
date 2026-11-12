import { OrdersErrorState } from '@/features/orders';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTreatmentSession } from '../hooks/useTreatmentSession';

/** The therapy note of a completed session (read only). */
export function SessionResultDialog({
  planId,
  session,
  onClose,
}: {
  planId: string;
  session: { id: string; sequenceNumber: number; serviceName: string } | null;
  onClose: () => void;
}) {
  const query = useTreatmentSession(planId, session?.id ?? '', session !== null);
  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{session ? `Ghi chú buổi ${session.sequenceNumber}` : ''}</DialogTitle>
          <DialogDescription>{session?.serviceName}</DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : query.isError ? (
          <OrdersErrorState
            error={query.error}
            title="Không tải được ghi chú"
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : (
          <p className="text-sm whitespace-pre-line">{query.data.result ?? 'Chưa có ghi chú'}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
