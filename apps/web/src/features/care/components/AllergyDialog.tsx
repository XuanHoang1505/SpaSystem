import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { AllergySeverity, CustomerAllergy } from '@spa/shared-types';
import { FormField } from '@/components/shared/FormField/FormField';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { allergySeverityBadge } from '@/features/bookings/appointmentStatus';
import { careErrorKind, careErrorMessage } from '../errors';
import { useCreateAllergy, useUpdateAllergy } from '../hooks/useCareMutations';
import { allergySchema, type AllergyOutput, type AllergyValues } from '../schemas';
import { NOT_IN_CARE_MESSAGE } from './careMessages';

const severities: readonly AllergySeverity[] = ['mild', 'moderate', 'severe'];

export interface AllergyDialogTarget {
  customerId: string;
  appointmentId: string;
  /** Null adds a new allergy. */
  allergy: CustomerAllergy | null;
}

/** Add or edit one allergy of the customer (UC-SPA-27 A2). */
export function AllergyDialog({
  target,
  onClose,
  onForbidden,
}: {
  target: AllergyDialogTarget | null;
  onClose: () => void;
  onForbidden: () => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {target && <AllergyForm target={target} onClose={onClose} onForbidden={onForbidden} />}
      </DialogContent>
    </Dialog>
  );
}

function AllergyForm({
  target,
  onClose,
  onForbidden,
}: {
  target: AllergyDialogTarget;
  onClose: () => void;
  onForbidden: () => void;
}) {
  const { customerId, appointmentId, allergy } = target;
  const createMutation = useCreateAllergy();
  const updateMutation = useUpdateAllergy();
  const pending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<AllergyValues, unknown, AllergyOutput>({
    resolver: zodResolver(allergySchema),
    defaultValues: {
      allergen: allergy?.allergen ?? '',
      severity: allergy?.severity,
      note: allergy?.note ?? '',
    },
  });

  const onError = (error: Error) => {
    switch (careErrorKind(error)) {
      case 'allergy_exists':
        form.setError('allergen', { message: 'Khách đã có dị ứng này.' });
        return;
      case 'validation':
        form.setError('allergen', { message: careErrorMessage(error) ?? 'Dữ liệu không hợp lệ.' });
        return;
      case 'not_in_care':
        toast.error(NOT_IN_CARE_MESSAGE);
        onForbidden();
        onClose();
        return;
      case 'allergy_missing':
        toast.error('Dị ứng này không còn, danh sách đã được tải lại.');
        onClose();
        return;
      default:
        toast.error(careErrorMessage(error) ?? 'Không lưu được dị ứng, vui lòng thử lại.');
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    const body = {
      allergen: values.allergen,
      severity: values.severity,
      note: values.note || null,
    };
    const onSuccess = () => {
      toast.success(allergy ? 'Đã cập nhật dị ứng.' : 'Đã thêm dị ứng.');
      onClose();
    };
    if (allergy)
      updateMutation.mutate(
        { customerId, appointmentId, allergyId: allergy.id, body },
        { onSuccess, onError },
      );
    else createMutation.mutate({ customerId, appointmentId, body }, { onSuccess, onError });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{allergy ? 'Sửa dị ứng' : 'Thêm dị ứng'}</DialogTitle>
        <DialogDescription>
          Dị ứng gắn với khách, mọi nhân viên chăm sóc khách đều thấy.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Tác nhân" required error={form.formState.errors.allergen?.message}>
        <Input placeholder="Ví dụ: Paraben, hương liệu" {...form.register('allergen')} />
      </FormField>

      <Controller
        control={form.control}
        name="severity"
        render={({ field, fieldState }) => (
          <FormField label="Mức độ" required error={fieldState.error?.message}>
            <RadioGroup
              value={field.value ?? ''}
              onValueChange={(value) =>
                field.onChange(severities.find((severity) => severity === value))
              }
              className="flex flex-wrap gap-4"
            >
              {severities.map((severity) => (
                <div key={severity} className="flex items-center gap-2">
                  <RadioGroupItem id={`allergy-severity-${severity}`} value={severity} />
                  <Label htmlFor={`allergy-severity-${severity}`} className="font-normal">
                    {allergySeverityBadge(severity).label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FormField>
        )}
      />

      <FormField label="Ghi chú" error={form.formState.errors.note?.message}>
        <Textarea
          rows={3}
          placeholder="Biểu hiện, lưu ý khi chăm sóc..."
          {...form.register('note')}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" loading={pending}>
          Lưu
        </Button>
      </DialogFooter>
    </form>
  );
}
