import { cn } from '@/lib/utils';

export function StepIndicator({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const text = `Bước ${current}/${total} · ${label}`;
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">{text}</p>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            data-segment
            data-done={index < current}
            className={cn('h-1 flex-1 rounded-full', index < current ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </div>
    </div>
  );
}
