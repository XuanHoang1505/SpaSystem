import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormField } from '@/components/shared/FormField/FormField';
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
import { Textarea } from '@/components/ui/textarea';
import { orderErrorMessage } from '../errors';
import { useCancelOrder } from '../hooks/useCancelOrder';
import { cancelOrderSchema, type CancelOrderValues } from '../schemas';

/** "Hủy đơn hàng?": asks for the reason (required), cancels, and explains a refusal from the API (UC-SPA-12 A2). */
export function CancelOrderDialog({
  order,
  onClose,
}: {
  order: { id: string; code: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {order && <CancelOrderForm key={order.id} order={order} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CancelOrderForm({
  order,
  onClose,
}: {
  order: { id: string; code: string };
  onClose: () => void;
}) {
  const cancel = useCancelOrder();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CancelOrderValues>({
    resolver: zodResolver(cancelOrderSchema),
    defaultValues: { reason: '' },
  });

  const submit = form.handleSubmit((values) => {
    setError(null);
    cancel.mutate(
      { id: order.id, reason: values.reason.trim() },
      {
        onSuccess: () => {
          toast.success(`Đã hủy đơn ${order.code}`);
          onClose();
        },
        onError: (failure) => setError(orderErrorMessage(failure)),
      },
    );
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Hủy đơn hàng?</DialogTitle>
        <DialogDescription>
          Đơn {order.code} sẽ bị hủy và không thể khôi phục. Bạn có thể đặt lại sau.
        </DialogDescription>
      </DialogHeader>
      <FormField label="Lý do hủy" error={form.formState.errors.reason?.message}>
        <Textarea rows={3} {...form.register('reason')} />
      </FormField>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Quay lại
        </Button>
        <Button type="submit" loading={cancel.isPending}>
          Xác nhận hủy
        </Button>
      </DialogFooter>
    </form>
  );
}
