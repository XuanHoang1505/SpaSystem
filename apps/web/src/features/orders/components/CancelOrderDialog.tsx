import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiClientError, orderErrorCodes } from '@spa/api-client';
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
import { orderErrorCode, orderErrorMessage } from '../errors';
import { cancelOrderSchema, type CancelOrderValues } from '../schemas';

/** What the dialog needs from a cancel mutation: the customer's (UC-SPA-12) and the owner's (UC-SPA-13) both fit. */
export interface CancelOrderMutation {
  mutate: (
    variables: { id: string; reason: string },
    handlers: { onSuccess: () => void; onError: (error: unknown) => void },
  ) => void;
  isPending: boolean;
}

interface CancelOrderDialogProps {
  order: { id: string; code: string } | null;
  onClose: () => void;
  cancel: CancelOrderMutation;
  description?: string;
  /** Called when the order no longer exists (404), before the dialog closes. */
  onNotFound?: () => void;
}

/** "Hủy đơn hàng {code}?": asks for the reason (required), cancels, and explains a refusal from the API. */
export function CancelOrderDialog({ order, onClose, ...rest }: CancelOrderDialogProps) {
  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {order && <CancelOrderForm key={order.id} order={order} onClose={onClose} {...rest} />}
      </DialogContent>
    </Dialog>
  );
}

function CancelOrderForm({
  order,
  onClose,
  cancel,
  description = 'Đơn sẽ bị hủy và không thể khôi phục. Bạn có thể đặt lại sau.',
  onNotFound,
}: Omit<CancelOrderDialogProps, 'order'> & { order: { id: string; code: string } }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CancelOrderValues>({
    resolver: zodResolver(cancelOrderSchema),
    defaultValues: { reason: '' },
  });

  const handleError = (failure: unknown) => {
    const code = orderErrorCode(failure);
    if (code === orderErrorCodes.orderNotFound) {
      toast.error('Không tìm thấy đơn hàng.');
      onNotFound?.();
      onClose();
      return;
    }
    const detail = failure instanceof ApiClientError ? failure.errors[0] : undefined;
    if (code === orderErrorCodes.validationError && detail?.field?.toLowerCase() === 'reason') {
      form.setError('reason', { message: detail.message });
      return;
    }
    setError(orderErrorMessage(failure));
  };

  const submit = form.handleSubmit((values) => {
    setError(null);
    cancel.mutate(
      { id: order.id, reason: values.reason.trim() },
      {
        onSuccess: () => {
          toast.success(`Đã hủy đơn ${order.code}`);
          onClose();
        },
        onError: handleError,
      },
    );
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Hủy đơn hàng {order.code}?</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
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
