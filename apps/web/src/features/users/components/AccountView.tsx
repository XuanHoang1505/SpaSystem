import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMe } from '../hooks/useMe';
import { ProfileCard } from './ProfileCard';
import { ChangePasswordCard } from './ChangePasswordCard';

export function AccountView() {
  useDocumentTitle('Thông tin tài khoản');
  const { data: user, isLoading, isError, refetch, isRefetching } = useMe();
  const { hash } = useLocation();

  // "Đổi mật khẩu" in the account menu links to /account#doi-mat-khau; scroll once the card is rendered.
  useEffect(() => {
    if (!user || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [user, hash]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Thông tin tài khoản"
        description="Quản lý thông tin cá nhân, ảnh đại diện và bảo mật tài khoản của bạn."
      />

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
          <ChangePasswordCard />
        </div>
      )}
    </div>
  );
}
