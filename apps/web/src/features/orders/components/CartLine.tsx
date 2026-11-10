import { CalendarClockIcon, PackageIcon, SparklesIcon, TrashIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CartItem } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatting/formatters';

/** One cart line: image, name, type, current price; a discontinued line is dimmed and not linked. */
export function CartLine({
  item,
  onRemove,
  removing,
}: {
  item: CartItem;
  onRemove: (item: CartItem) => void;
  removing: boolean;
}) {
  const isPackage = item.type === 'package';
  const href = `${isPackage ? '/packages' : '/services'}/${item.productId}`;
  return (
    <li className="group relative flex gap-4 rounded-2xl border bg-card/80 p-4 sm:p-5 shadow-2xs transition-all hover:bg-card hover:shadow-xs">
      <ImageWithFallback
        src={item.imageUrl}
        alt={item.name}
        fallbackIcon={isPackage ? PackageIcon : SparklesIcon}
        className={cn(
          'size-20 shrink-0 rounded-xl border object-cover shadow-2xs sm:size-24',
          !item.isAvailable && 'opacity-50',
        )}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className={cn('flex flex-wrap items-center gap-2', !item.isAvailable && 'opacity-60')}>
          <Badge variant="secondary" className="font-medium">
            {isPackage ? 'Gói liệu trình' : 'Dịch vụ lẻ'}
          </Badge>
          {!item.isAvailable && <Badge variant="outline">Ngừng bán</Badge>}
        </div>
        <h3 className={cn('font-heading text-lg font-semibold leading-snug', !item.isAvailable && 'opacity-60')}>
          {item.isAvailable ? (
            <Link to={href} className="text-foreground transition-colors hover:text-primary">
              {item.name}
            </Link>
          ) : (
            item.name
          )}
        </h3>
        {item.isAvailable ? (
          <div className="space-y-1">
            <p className="font-heading text-xl font-bold text-primary">
              {formatCurrency(item.currentPrice)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClockIcon className="size-3.5 text-primary" aria-hidden="true" />
              {isPackage
                ? 'Được bảo lưu thời hạn · Tự do đặt lịch từng buổi sau khi mua'
                : 'Lưu vào tài khoản · Chọn ngày, giờ và chuyên viên sau'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sản phẩm này không còn bán, hãy xóa khỏi giỏ.
          </p>
        )}
        {item.isAvailable && item.priceChanged && (
          <p className="text-xs text-muted-foreground">
            Giá đã đổi, lúc thêm là {formatCurrency(item.unitPrice)}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Xóa ${item.name} khỏi giỏ`}
        className="text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        disabled={removing}
        onClick={() => onRemove(item)}
      >
        <TrashIcon className="size-4.5" aria-hidden="true" />
      </Button>
    </li>
  );
}
