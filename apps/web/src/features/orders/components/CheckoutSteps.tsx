import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = ['Giỏ hàng', 'Thanh toán', 'Hoàn tất'] as const;

/**
 * Three-step trail "Giỏ hàng → Thanh toán → Hoàn tất"; `current` is 1-based. Under `sm` only the circles show, and a
 * "Bước 2/3 · Thanh toán" caption (screen readers always get the labels).
 */
export function CheckoutSteps({ current, className }: { current: 1 | 2 | 3; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ol aria-label="Các bước mua hàng" className="flex items-center gap-2 text-sm">
        {steps.map((label, index) => {
          const number = index + 1;
          const done = number < current;
          return (
            <li
              key={label}
              data-done={done}
              aria-current={number === current ? 'step' : undefined}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                  done && 'border-primary bg-primary text-primary-foreground',
                  number === current && 'border-primary bg-accent text-primary',
                  number > current && 'bg-card text-muted-foreground',
                )}
              >
                {done ? <CheckIcon className="size-4" aria-hidden="true" /> : number}
              </span>
              <span
                className={cn(
                  'sr-only md:not-sr-only',
                  number === current ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
              {number < steps.length && (
                <span
                  aria-hidden="true"
                  className={cn('h-px w-4 sm:w-8 lg:w-12', done ? 'bg-primary' : 'bg-border')}
                />
              )}
            </li>
          );
        })}
      </ol>
      <span
        aria-hidden="true"
        className="hidden text-xs font-medium text-muted-foreground min-[480px]:inline md:hidden"
      >
        Bước {current}/3 · {steps[current - 1]}
      </span>
    </div>
  );
}
