import { Link } from 'react-router-dom';
import { useMe } from '@/features/users/hooks/useMe';
import { useAuthStore } from '@/stores/authStore';
import { CheckoutSection } from './CheckoutSection';

/** "Người nhận dịch vụ": who the purchase is saved to, with the phone the spa calls about visits. */
export function CustomerInfoCard({ step }: { step?: number }) {
  const user = useAuthStore((state) => state.user);
  const me = useMe(Boolean(user));
  if (!user) return null;
  const name = me.data?.fullName ?? user.fullName;
  const initial = name ? name.trim().charAt(0).toUpperCase() : 'U';
  const contacts = [me.data?.phoneNumber, me.data?.email ?? user.email].filter(Boolean).join(' · ');

  return (
    <CheckoutSection
      step={step}
      title="Người nhận dịch vụ"
      aside={
        <Link
          to="/account"
          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Sửa
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-heading font-semibold text-primary"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-sm break-all text-muted-foreground">{contacts}</p>
        </div>
      </div>
    </CheckoutSection>
  );
}
