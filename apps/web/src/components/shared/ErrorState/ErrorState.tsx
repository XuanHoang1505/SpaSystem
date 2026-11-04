import { CircleAlertIcon, RotateCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ErrorState({
  title = 'Không tải được dữ liệu',
  message,
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  /** Thông điệp cho người dùng; không đưa chi tiết kỹ thuật hay traceId vào đây. */
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}
    >
      <span className="mb-1 grid size-12 place-items-center rounded-full bg-status-danger text-status-danger-foreground">
        <CircleAlertIcon className="size-6" aria-hidden="true" />
      </span>
      <p className="text-base font-semibold">{title}</p>
      {message && <p className="max-w-md text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-2" onClick={onRetry} loading={retrying}>
          {!retrying && <RotateCwIcon aria-hidden="true" />}
          Thử lại
        </Button>
      )}
    </div>
  );
}
