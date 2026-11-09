import { PackageIcon, SparklesIcon, TrashIcon } from 'lucide-react';
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
    <li className="flex gap-4 rounded-xl border bg-card p-4">
      <ImageWithFallback
        src={item.imageUrl}
        alt={item.name}
        fallbackIcon={isPackage ? PackageIcon : SparklesIcon}
        className={cn('size-20 shrink-0 rounded-lg sm:size-24', !item.isAvailable && 'opacity-50')}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className={cn('flex flex-wrap items-center gap-2', !item.isAvailable && 'opacity-60')}>
          <Badge variant="secondary">{isPackage ? 'Gói' : 'Dịch vụ'}</Badge>
          {!item.isAvailable && <Badge variant="outline">Ngừng bán</Badge>}
        </div>
        <h3 className={cn('font-heading text-lg leading-snug', !item.isAvailable && 'opacity-60')}>
          {item.isAvailable ? (
            <Link to={href} className="hover:text-primary hover:underline">
              {item.name}
            </Link>
          ) : (
            item.name
          )}
        </h3>
        {item.isAvailable ? (
          <p className="font-heading text-lg font-semibold text-primary">
            {formatCurrency(item.currentPrice)}
          </p>
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
        disabled={removing}
        onClick={() => onRemove(item)}
      >
        <TrashIcon aria-hidden="true" />
      </Button>
    </li>
  );
}
