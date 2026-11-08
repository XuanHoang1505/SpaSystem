import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const stackedTone = {
  accent: 'bg-accent text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  success: 'bg-status-success text-status-success-foreground',
} as const;

/**
 * Ô thông tin có icon.
 * - `row`: nền nhạt, icon trong ô vuông, nhãn nhỏ trên giá trị (chi tiết dịch vụ).
 * - `stacked`: nền màu theo `tone`, căn giữa: icon, giá trị lớn, nhãn (chi tiết gói).
 */
export function InfoTile({
  icon: Icon,
  label,
  value,
  layout = 'row',
  tone = 'accent',
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  layout?: 'row' | 'stacked';
  tone?: keyof typeof stackedTone;
  className?: string;
}) {
  if (layout === 'stacked')
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-1 rounded-xl px-3 py-4 text-center',
          stackedTone[tone],
          className,
        )}
      >
        <span className="mb-1 grid size-8 place-items-center rounded-full bg-card text-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <p className="order-2 text-[11px] font-semibold tracking-wide">{label}</p>
        <p className="order-1 font-heading text-xl font-semibold text-foreground">{value}</p>
      </div>
    );
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border bg-muted/60 p-4', className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-card text-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value}</p>
      </div>
    </div>
  );
}
