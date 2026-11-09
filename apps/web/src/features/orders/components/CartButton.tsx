import { ShoppingCartIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCart } from '../hooks/useCart';

/** Header link to `/cart` with the number of lines; renders nothing unless a customer is signed in. */
export function CartButton() {
  const { data } = useCart();
  if (!data) return null;
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/cart" aria-label={`Giỏ hàng, ${data.itemCount} sản phẩm`}>
        <ShoppingCartIcon aria-hidden="true" />
        {data.itemCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground"
          >
            {data.itemCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
