import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCustomerAction } from '@/features/orders/components/useCustomerAction';
import { bookingPath, type BookingPrefill } from '../bookingParams';

/**
 * "Đặt lịch" for one service (book now, UC-SPA-15): a customer goes to the booking page, a visitor to login and back
 * with the same query, staff and owners do not see it. `prefill` carries a free hour picked on the service page.
 */
export function BookServiceButton({
  serviceId,
  prefill,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick' | 'asChild'> & {
  serviceId: string;
  prefill?: BookingPrefill;
}) {
  const navigate = useNavigate();
  const { visible, run } = useCustomerAction();
  if (!visible) return null;
  const target = bookingPath({ kind: 'service', serviceId }, prefill);
  const [pathname = '', search = ''] = target.split('?');
  return (
    <Button
      {...props}
      onClick={() => run({ pathname, search: `?${search}` }, () => navigate(target))}
    />
  );
}
