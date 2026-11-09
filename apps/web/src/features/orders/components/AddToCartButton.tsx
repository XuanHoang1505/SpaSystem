import { CheckIcon, ShoppingCartIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { orderErrorCode, orderErrorMessage } from '../errors';
import { useAddToCart } from '../hooks/useAddToCart';
import { useCart } from '../hooks/useCart';
import { useCustomerAction } from './useCustomerAction';

/** "Thêm vào giỏ" (UC-SPA-10): one product per line; a product already in the cart turns the button into a link. */
export function AddToCartButton({
  product,
  iconOnly = false,
  productName = '',
}: {
  product: { type: 'service' | 'package'; id: string };
  /** Compact icon button for cards; `productName` then names it for assistive technology. */
  iconOnly?: boolean;
  productName?: string;
}) {
  const location = useLocation();
  const { visible, run } = useCustomerAction();
  const add = useAddToCart();
  const cart = useCart();
  if (!visible) return null;
  const inCart = cart.data?.items.some(
    (line) => line.type === product.type && line.productId === product.id,
  );

  if (inCart || add.isSuccess || orderErrorCode(add.error) === 'cart_item_exists')
    return (
      <Button asChild size={iconOnly ? 'icon' : 'lg'} variant="outline" className="bg-card">
        <Link
          to="/cart"
          aria-label={iconOnly ? `${productName} đã có trong giỏ, xem giỏ` : undefined}
        >
          <CheckIcon aria-hidden="true" />
          {!iconOnly && 'Đã có trong giỏ · Xem giỏ'}
        </Link>
      </Button>
    );

  const submit = () =>
    add.mutate(
      product.type === 'service' ? { spaServiceId: product.id } : { servicePackageId: product.id },
      {
        onSuccess: () => toast.success('Đã thêm vào giỏ hàng'),
        onError: (error) => {
          if (orderErrorCode(error) !== 'cart_item_exists') toast.error(orderErrorMessage(error));
        },
      },
    );

  return (
    <Button
      size={iconOnly ? 'icon' : 'lg'}
      variant="outline"
      className="bg-card"
      loading={add.isPending}
      aria-label={iconOnly ? `Thêm ${productName} vào giỏ` : undefined}
      onClick={() => run(location, submit)}
    >
      <ShoppingCartIcon aria-hidden="true" />
      {!iconOnly && 'Thêm vào giỏ'}
    </Button>
  );
}
