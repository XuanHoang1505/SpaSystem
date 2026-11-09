import { ShoppingBagIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { checkoutPath } from '../checkoutParams';
import { useCustomerAction } from './useCustomerAction';

/** "Mua ngay" a package: straight to the checkout with `source=buy_now` (UC-SPA-11). */
export function BuyNowButton({ packageId }: { packageId: string }) {
  const navigate = useNavigate();
  const { visible, run } = useCustomerAction();
  if (!visible) return null;
  const target = checkoutPath({ source: 'buy_now', servicePackageId: packageId });
  const [pathname = '', search = ''] = target.split('?');
  return (
    <Button
      size="lg"
      onClick={() => run({ pathname, search: `?${search}` }, () => navigate(target))}
    >
      <ShoppingBagIcon aria-hidden="true" />
      Mua ngay gói liệu trình
    </Button>
  );
}
