import { MailIcon, UserIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

/** "Thông tin khách hàng": who the purchase is saved to. */
export function CustomerInfoCard() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  const initial = user.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U';

  return (
    <Card className="rounded-2xl border bg-card/80 shadow-2xs">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 border-b pb-3.5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <UserIcon className="size-5 text-primary" aria-hidden="true" />
            2. Thông tin khách hàng
          </h2>
        </div>

        <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-lg font-bold text-primary ring-2 ring-primary/20">
            {initial}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-heading text-base font-semibold text-foreground">{user.fullName}</p>
            <p className="flex items-center gap-1.5 text-xs break-all text-muted-foreground">
              <MailIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
