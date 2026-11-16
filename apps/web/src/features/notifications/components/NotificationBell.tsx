import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, CheckCheckIcon, InboxIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationMutations } from '../hooks/useNotificationMutations';
import { useNotificationRealtime } from '../hooks/useNotificationRealtime';
import {
  notificationTypeIcons,
  getNotificationTargetRoute,
} from '../types';
import { formatRelativeTime } from '../utils/formatTime';
import { cn } from '@/lib/utils';
import type { NotificationDto } from '@spa/shared-types';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  // Initialize and maintain SignalR connection
  useNotificationRealtime();

  const { data: unreadData } = useUnreadNotificationCount();
  const { data: recentData, isLoading } = useNotifications({
    pageNumber: 1,
    pageSize: 5,
    enabled: open,
  });
  const { markRead, markAllRead, isMarkingAllRead } = useNotificationMutations();

  if (status !== 'authenticated') {
    return null;
  }

  const unreadCount = unreadData?.count ?? 0;
  const items = recentData?.items ?? [];

  const handleItemClick = (item: NotificationDto) => {
    if (!item.isRead) {
      markRead(item.id);
    }
    setOpen(false);

    const targetRoute = getNotificationTargetRoute(item, user?.role);
    if (targetRoute) {
      navigate(targetRoute);
    } else {
      navigate('/notifications');
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative h-9 w-9 rounded-full', className)}
          aria-label="Thông báo"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-lg border-border"
      >
        <div className="flex items-center justify-between p-3.5 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Thông báo</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {unreadCount} chưa đọc
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead()}
              disabled={isMarkingAllRead}
              className="h-7 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2"
            >
              <CheckCheckIcon className="h-3.5 w-3.5" />
              <span>Đọc tất cả</span>
            </Button>
          )}
        </div>
        <Separator />

        <div className="max-h-84 overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <InboxIcon className="h-8 w-8 stroke-1 text-muted-foreground/60" />
              <p className="text-xs">Chưa có thông báo nào</p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = notificationTypeIcons[item.type] || BellIcon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-start gap-3 relative cursor-pointer',
                    !item.isRead && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      !item.isRead
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p
                      className={cn(
                        'text-xs leading-snug line-clamp-1',
                        !item.isRead
                          ? 'font-semibold text-foreground'
                          : 'text-muted-foreground font-medium'
                      )}
                    >
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {item.body}
                    </p>
                    <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                      {formatRelativeTime(item.createdAtUtc)}
                    </span>
                  </div>
                  {!item.isRead && (
                    <span className="absolute right-3 top-4 h-2 w-2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <Separator />
        <div className="p-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="w-full text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 h-8"
          >
            Xem tất cả thông báo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
