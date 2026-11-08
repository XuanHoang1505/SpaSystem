import { cn } from '@/lib/utils';

/** Hình khối phẳng trang trí lấp ló sau ảnh chi tiết (hình tròn sage, vòm hồng); ẩn dưới md. */
export function DecorativeShapes({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 hidden md:block', className)}
    >
      <div className="absolute -top-5 -left-5 size-28 rounded-full bg-secondary" />
      <div className="absolute -right-5 -bottom-5 h-32 w-40 rounded-t-full bg-chart-5/40" />
    </div>
  );
}
