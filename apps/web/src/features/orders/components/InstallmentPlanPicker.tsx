import { InfoIcon } from 'lucide-react';
import type { InstallmentOption, PromotionError } from '@spa/shared-types';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatCurrency } from '@/lib/formatting/formatters';
import { cn } from '@/lib/utils';
import { CheckoutSection } from './CheckoutSection';
import { InstallmentTable } from './InstallmentSchedule';

/**
 * "Hình thức thanh toán" of SCR-W11 for a one-package order (docs/specs/order-installments.md): pay in full, or in 2–3
 * installments that each unlock a run of sessions. Every choice says what is paid today and which sessions it opens.
 * `value` is the chosen installment count, null = pay in full.
 */
export function InstallmentPlanPicker({
  step,
  grandTotal,
  options,
  unavailable,
  value,
  onChange,
  disabled = false,
}: {
  step?: number;
  grandTotal: number;
  options: readonly InstallmentOption[];
  unavailable: PromotionError | null;
  value: number | null;
  onChange: (installmentCount: number | null) => void;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.installmentCount === value) ?? null;
  const totalSessions = options[0]?.installments.at(-1)?.lastSessionNumber;
  const choices = [
    {
      key: 'full',
      title: 'Trả một lần',
      today: grandTotal,
      opens: totalSessions ? `Mở cả ${totalSessions} buổi` : 'Mở tất cả các buổi',
    },
    ...options.map((option) => {
      const first = option.installments[0];
      return {
        key: String(option.installmentCount),
        title: `Trả ${option.installmentCount} đợt`,
        today: first?.amount ?? 0,
        opens: first
          ? `Mở buổi ${first.firstSessionNumber}–${first.lastSessionNumber} trước`
          : 'Mở dần theo đợt',
      };
    }),
  ];
  const current = selected ? String(selected.installmentCount) : 'full';

  return (
    <CheckoutSection
      step={step}
      title="Hình thức thanh toán"
      description="Trả theo đợt: mỗi đợt mở khóa một nhóm buổi của gói, trả đến đâu dùng đến đó."
    >
      <RadioGroup
        aria-label="Hình thức thanh toán"
        value={current}
        onValueChange={(next) => onChange(next === 'full' ? null : Number(next))}
        disabled={disabled}
        className="grid gap-3 sm:grid-cols-3"
      >
        {choices.map((choice) => {
          const checked = choice.key === current;
          const id = `plan-${choice.key}`;
          return (
            <Label
              key={choice.key}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer flex-col items-stretch gap-2 rounded-xl border p-4 font-normal transition-colors',
                checked
                  ? 'border-primary bg-accent/50 ring-1 ring-primary'
                  : 'bg-card hover:border-primary/40',
              )}
            >
              <span className="flex items-center gap-2.5">
                <RadioGroupItem id={id} value={choice.key} />
                <span className="font-medium text-foreground">{choice.title}</span>
              </span>
              <span className="grid gap-0.5 pl-6.5">
                <span className="text-xs text-muted-foreground">Hôm nay trả</span>
                <span className="font-heading text-lg font-semibold text-primary">
                  {formatCurrency(choice.today)}
                </span>
                <span className="text-xs text-muted-foreground">{choice.opens}</span>
              </span>
            </Label>
          );
        })}
      </RadioGroup>
      {options.length === 0 && unavailable && (
        <p className="text-sm text-muted-foreground">{unavailable.message}</p>
      )}
      {selected && (
        <div className="space-y-3">
          <InstallmentTable installments={selected.installments} />
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            Đợt sau trả lúc nào cũng được trước khi gói hết hạn. Buổi chưa trả tạm khóa, chưa đặt
            lịch được.
          </p>
        </div>
      )}
    </CheckoutSection>
  );
}
