import { ClockIcon } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';

const mmss = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** "Mã hết hạn sau mm:ss" from the server's `expiresAtUtc`; only the expiry itself is announced. */
export function OtpExpiry({ expiresAtUtc }: { expiresAtUtc: string }) {
  const seconds = useCountdown(expiresAtUtc);
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <ClockIcon className="size-3.5" aria-hidden="true" />
      {seconds > 0 ? (
        <span>Mã hết hạn sau {mmss(seconds)}</span>
      ) : (
        <span aria-live="polite" className="text-destructive">
          Mã đã hết hạn. Vui lòng gửi lại mã.
        </span>
      )}
    </p>
  );
}
