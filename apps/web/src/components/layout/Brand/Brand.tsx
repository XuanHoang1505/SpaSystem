import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn('flex items-center gap-3 rounded-md', className)}
      aria-label="Như Nguyệt Spa, về trang chủ"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full border border-primary font-heading text-lg text-primary"
        aria-hidden="true"
      >
        N
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-xl">Như Nguyệt</span>
          <span className="mt-1 text-[10px] tracking-[0.2em] text-muted-foreground">
            SPA & CHĂM SÓC DA
          </span>
        </span>
      )}
    </Link>
  );
}
