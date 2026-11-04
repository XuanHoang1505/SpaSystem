import { useSystemStatus } from '@/hooks/useSystemStatus';
import { StatusBadge, type StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

export function SystemStatus() {
  const status = useSystemStatus();
  const [text, tone]: [string, StatusTone] = status.configurationError
    ? [`Configuration Error · ${status.configurationError}`, 'danger']
    : status.isPending
      ? ['Loading · Đang kiểm tra API…', 'neutral']
      : status.isError
        ? ['API Offline · Chưa kết nối được máy chủ', 'danger']
        : ['API Online · Hệ thống hoạt động', 'success'];
  return (
    <div role="status" aria-live="polite">
      <StatusBadge label={text} tone={tone} className="px-3 py-1.5 text-sm whitespace-normal" />
    </div>
  );
}
