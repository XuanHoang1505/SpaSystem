import { ShoppingCartIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCart } from '../hooks/useCart';

/** Header link to `/cart` with the number of lines; renders nothing unless a customer is signed in. */
export function CartButton() {
  const { data } = useCart();
  if (!data) return null;
  return (
    <Button asChild variant="ghost" size="icon" className="relative rounded-full">
      <Link to="/cart" aria-label={`Giỏ hàng, ${data.itemCount} sản phẩm`}>
        <ShoppingCartIcon aria-hidden="true" className="size-5" />
        {data.itemCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground"
          >
            {data.itemCount > 99 ? '99+' : data.itemCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
