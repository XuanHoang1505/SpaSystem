import { useSystemStatus } from '@/hooks/useSystemStatus';
export function SystemStatus() {
  const status = useSystemStatus();
  const text = status.configurationError
    ? `Configuration Error · ${status.configurationError}`
    : status.isPending
      ? 'Loading · Đang kiểm tra API…'
      : status.isError
        ? 'API Offline · Chưa kết nối được máy chủ'
        : 'API Online · Hệ thống hoạt động';
  const state =
    status.configurationError || status.isError
      ? 'error'
      : status.isPending
        ? 'loading'
        : 'success';
  return (
    <div className={`system-status ${state}`} role="status" aria-live="polite">
      <span aria-hidden="true">●</span>
      {text}
    </div>
  );
}
