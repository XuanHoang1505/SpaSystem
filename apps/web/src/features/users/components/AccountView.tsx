import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountPage } from '@/components/layout/AccountLayout/AccountPage';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { homePathFor } from '@/features/auth/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useMe } from '../hooks/useMe';
import { ProfileCard } from './ProfileCard';
import { ChangePasswordCard } from './ChangePasswordCard';

export function AccountView() {
  useDocumentTitle('Thông tin tài khoản');
  const { data: user, isLoading, isError, refetch, isRefetching } = useMe();
  const { hash } = useLocation();
  const role = useAuthStore((state) => state.user?.role);
  // Same trails as the other workspace pages: the owner's go through "Quản trị spa".
  const trail =
    role === 'owner'
      ? [
          { label: 'Trang chủ', to: '/' },
          { label: 'Quản trị spa', to: homePathFor(role) },
        ]
      : [{ label: 'Trang chủ', to: '/' }];

  // "Đổi mật khẩu" in the account menu links to /account#doi-mat-khau; scroll once the card is rendered.
  useEffect(() => {
    if (!user || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [user, hash]);

  return (
    <AccountPage breadcrumbs={[...trail, { label: 'Tài khoản' }]} title="Thông tin tài khoản">
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : isError || !user ? (
        <div className="py-8">
          <ErrorState
            title="Không tải được thông tin tài khoản"
            message="Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau."
            onRetry={() => refetch()}
            retrying={isRefetching}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <ProfileCard user={user} />
          <ChangePasswordCard hasPassword={user.hasPassword} />
        </div>
      )}
    </AccountPage>
  );
}
