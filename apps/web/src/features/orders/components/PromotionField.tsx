import { zodResolver } from '@hookform/resolvers/zod';
import { TagIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { AppliedPromotion, PromotionError } from '@spa/shared-types';
import { FormField } from '@/components/shared/FormField/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatting/formatters';
import { promotionCodeSchema, type PromotionCodeValues } from '../schemas';

/** Promotion code box of the checkout: applies through a new preview, never validates the rules itself. */
export function PromotionField({
  applied,
  error,
  pending,
  onApply,
  onRemove,
}: {
  applied: AppliedPromotion | null;
  error: PromotionError | null;
  pending: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const form = useForm<PromotionCodeValues>({
    resolver: zodResolver(promotionCodeSchema),
    defaultValues: { code: '' },
  });
  const { errors } = form.formState;

  if (applied)
    return (
      <div
        role="status"
        className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4"
      >
        <p className="flex items-center gap-2 text-sm">
          <TagIcon className="size-4 text-primary" aria-hidden="true" />
          <span>
            Mã {applied.code}: −{formatCurrency(applied.discountAmount)}
          </span>
        </p>
        <Button variant="ghost" size="sm" onClick={onRemove} disabled={pending}>
          Bỏ mã
        </Button>
      </div>
    );

  return (
    <form
      noValidate
      className="space-y-2 rounded-xl border bg-card p-4"
      onSubmit={form.handleSubmit((values) => onApply(values.code.trim().toUpperCase()))}
    >
      <div className="flex flex-wrap items-end gap-2">
        <FormField
          label="Mã khuyến mãi"
          error={errors.code?.message ?? error?.message}
          className="min-w-40 flex-1"
        >
          <Input autoComplete="off" className="uppercase" {...form.register('code')} />
        </FormField>
        <Button type="submit" variant="outline" loading={pending}>
          Áp dụng
        </Button>
      </div>
    </form>
  );
}
