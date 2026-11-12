import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

// Viết đủ tên class để Tailwind quét được. Màu lấy từ token status-* trong theme.css.
const toneClass: Record<StatusTone, string> = {
  success: 'bg-status-success text-status-success-foreground',
  warning: 'bg-status-warning text-status-warning-foreground',
  info: 'bg-status-info text-status-info-foreground',
  danger: 'bg-status-danger text-status-danger-foreground',
  neutral: 'bg-status-neutral text-status-neutral-foreground',
};

/**
 * Nhãn trạng thái dùng chung. Feature map enum backend → { label, tone } trong một file
 * (ví dụ `appointmentStatus.ts`) rồi truyền vào đây; không tạo bảng màu badge riêng.
 */
export function StatusBadge({
  label,
  tone,
  status,
  className,
}: {
  label: string;
  tone: StatusTone;
  /** Giá trị enum gốc, gắn vào data-status để test và debug. */
  status?: string;
  className?: string;
}) {
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        toneClass[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
