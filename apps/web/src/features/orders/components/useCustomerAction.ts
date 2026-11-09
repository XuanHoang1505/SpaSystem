import { useNavigate } from 'react-router-dom';
import { loginPathFor } from '@/features/auth/navigation';
import { useAuthStore } from '@/stores/authStore';

/**
 * Purchase buttons are for customers and visitors: staff and owners never see them. A visitor who acts is sent to
 * login and comes back to `returnTo` afterwards.
 */
export function useCustomerAction() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);
  const isCustomer = status === 'authenticated' && role === 'customer';
  const visible = status !== 'authenticated' || isCustomer;
  const run = (returnTo: { pathname: string; search: string }, action: () => void) => {
    if (isCustomer) action();
    else navigate(loginPathFor(returnTo));
  };
  return { visible, run };
}
