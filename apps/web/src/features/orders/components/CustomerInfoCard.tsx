import { UserIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

/** "Thông tin khách hàng": who the purchase is saved to (read from the session; the order takes no extra fields). */
export function CustomerInfoCard() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl">
          <UserIcon className="size-5 text-primary" aria-hidden="true" />
          Thông tin khách hàng
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/40 p-3">
            <dt className="text-xs text-muted-foreground">Họ và tên</dt>
            <dd className="font-medium">{user.fullName}</dd>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="font-medium break-all">{user.email}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Dịch vụ và gói bạn mua được lưu vào tài khoản này để đặt lịch hẹn sau.
        </p>
      </CardContent>
    </Card>
  );
}
