import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import logo from '@/assets/images/logo.png';

export function Brand({
  className,
  imgClassName,
  compact = false,
}: {
  className?: string;
  imgClassName?: string;
  compact?: boolean;
}) {
  return (
    <Link
      to="/"
      className={cn(
        'group flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
      aria-label="Như Nguyệt Spa, về trang chủ"
    >
      <img
        src={logo}
        alt="Như Nguyệt Spa"
        className={cn(
          'h-14 w-auto max-w-[190px] shrink-0 object-contain transition-transform duration-300 group-hover:scale-105 sm:h-[80px] sm:max-w-[270px]',
          compact ? 'h-8 max-w-[80px] sm:h-8' : '',
          imgClassName,
        )}
      />
    </Link>
  );
}
