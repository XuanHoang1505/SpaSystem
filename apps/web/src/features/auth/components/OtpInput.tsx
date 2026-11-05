import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * One field for the 6-digit code. Non-digits are dropped as they arrive, so a pasted "123 456" works; there is
 * deliberately no `maxLength`, which would cut the paste before the filter runs.
 */
export function OtpInput({ className, onChange, ...props }: ComponentProps<'input'>) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="000000"
      className={cn('text-center font-mono text-lg tracking-widest', className)}
      onChange={(event) => {
        event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
        onChange?.(event);
      }}
      {...props}
    />
  );
}
