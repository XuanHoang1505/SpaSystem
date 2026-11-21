import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountPage } from '@/components/layout/AccountLayout/AccountPage';
import { useAuthStore } from '@/stores/authStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import { useNotificationMutations } from '../hooks/useNotificationMutations';
import { useNotificationRealtime } from '../hooks/useNotificationRealtime';
import { NotificationFilterTabs } from './NotificationFilterTabs';
import { NotificationFeed } from './NotificationFeed';
import { getNotificationTargetRoute } from '../types';
import type { NotificationDto, NotificationType } from '@spa/shared-types';

export function NotificationsView() {
  useDocumentTitle('Thông báo');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Ensure realtime connection is active
  useNotificationRealtime();

  const unreadOnly = searchParams.get('tab') === 'unread';
  const rawType = searchParams.get('type');
  const type: NotificationType | undefined =
    rawType && ['appointment', 'payment', 'treatment', 'promotion', 'system'].includes(rawType)
      ? (rawType as NotificationType)
      : undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 10;

  const queryParams = useMemo(
    () => ({
      unreadOnly,
      type,
      pageNumber: page,
      pageSize,
    }),
    [unreadOnly, type, page, pageSize],
  );

  const { data, isLoading, isError, refetch } = useNotifications(queryParams);
  const { data: unreadData } = useUnreadNotificationCount();
  const { markRead, markAllRead, isMarkingAllRead, isMarkingRead } = useNotificationMutations();

  const unreadCount = unreadData?.count ?? 0;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleTabChange = (newUnreadOnly: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newUnreadOnly) {
        next.set('tab', 'unread');
      } else {
        next.delete('tab');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleTypeChange = (newType: NotificationType | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newType) {
        next.set('type', newType);
      } else {
        next.delete('type');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', newPage.toString());
      return next;
    });
  };

  const handleItemClick = (item: NotificationDto) => {
    if (!item.isRead) {
      markRead(item.id);
    }
    const targetRoute = getNotificationTargetRoute(item, user?.role);
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  const isWorkspace = user?.role === 'staff' || user?.role === 'owner';
  const breadcrumbTrail = isWorkspace
    ? [
        { label: 'Trang chủ', to: '/' },
        {
          label: user?.role === 'owner' ? 'Quản lý' : 'Nhân viên',
          to: user?.role === 'owner' ? '/owner' : '/staff',
        },
        { label: 'Thông báo' },
      ]
    : [
        { label: 'Trang chủ', to: '/' },
        { label: 'Tài khoản', to: '/account' },
        { label: 'Thông báo' },
      ];

  return (
    <AccountPage
      breadcrumbs={breadcrumbTrail}
      title="Thông báo"
      description="Theo dõi các thông tin cập nhật về lịch hẹn, liệu trình, thanh toán và thông báo hệ thống."
      actions={
        unreadCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead()}
            disabled={isMarkingAllRead}
            className="flex items-center gap-1.5"
          >
            <CheckCheckIcon className="h-4 w-4" />
            <span>Đánh dấu tất cả đã đọc</span>
          </Button>
        ) : undefined
      }

      toolbar={
        <NotificationFilterTabs
          unreadOnly={unreadOnly}
          onUnreadOnlyChange={handleTabChange}
          type={type}
          onTypeChange={handleTypeChange}
          unreadCount={unreadCount}
        />
      }
    >
      <NotificationFeed
        items={items}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        pageNumber={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onItemClick={handleItemClick}
        onMarkRead={markRead}
        isMarkingRead={isMarkingRead}
        unreadOnly={unreadOnly}
      />
    </AccountPage>
  );
}
