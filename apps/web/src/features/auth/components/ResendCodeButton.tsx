import { Button } from '@/components/ui/button';
import { useCountdown } from '../hooks/useCountdown';

/** Disabled until the server's `resendAvailableAtUtc` (BR-AUTH-25); the wait is never hard-coded here. */
export function ResendCodeButton({
  availableAtUtc,
  onResend,
  loading = false,
}: {
  availableAtUtc: string | null;
  onResend: () => void;
  loading?: boolean;
}) {
  const seconds = useCountdown(availableAtUtc);
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto px-0"
      disabled={seconds > 0}
      loading={loading}
      onClick={onResend}
    >
      {seconds > 0 ? `Gửi lại mã sau ${seconds} giây` : 'Gửi lại mã'}
    </Button>
  );
}
