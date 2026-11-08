import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Ảnh có khối dự phòng khi không có URL hoặc tải lỗi. Kích thước/tỉ lệ do `className` quyết định. */
export function ImageWithFallback({
  src,
  alt,
  fallbackIcon: Icon,
  className,
}: {
  src: string | null;
  alt: string;
  fallbackIcon: LucideIcon;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src)
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('grid place-items-center bg-accent text-accent-foreground', className)}
      >
        <Icon className="size-1/2 max-h-10 max-w-10 opacity-70" aria-hidden="true" />
      </div>
    );
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={cn('object-cover', className)}
    />
  );
}
