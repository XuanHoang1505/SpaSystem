import { Loader2Icon } from 'lucide-react';

export function PageLoader({ label = 'Đang tải trang…' }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground"
      role="status"
    >
      <Loader2Icon className="size-6 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
