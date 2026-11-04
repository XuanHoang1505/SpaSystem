import type { ReactNode } from 'react';
import { InboxIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title = 'Chưa có dữ liệu',
  description,
  icon: Icon = InboxIcon,
  action,
  className,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Nút hành động, ví dụ "Xóa bộ lọc" hoặc "Thêm dịch vụ". */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}
      aria-label={title}
    >
      <span className="mb-1 grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="font-sans text-base font-semibold">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </section>
  );
}
