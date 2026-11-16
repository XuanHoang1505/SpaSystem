import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { notificationTypeLabels } from '../types';
import type { NotificationType } from '@spa/shared-types';

interface NotificationFilterTabsProps {
  unreadOnly: boolean;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  type?: NotificationType;
  onTypeChange: (type: NotificationType | undefined) => void;
  unreadCount: number;
}

const typeOptions: { value: NotificationType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'appointment', label: notificationTypeLabels.appointment },
  { value: 'payment', label: notificationTypeLabels.payment },
  { value: 'treatment', label: notificationTypeLabels.treatment },
  { value: 'promotion', label: notificationTypeLabels.promotion },
  { value: 'system', label: notificationTypeLabels.system },
];

export function NotificationFilterTabs({
  unreadOnly,
  onUnreadOnlyChange,
  type,
  onTypeChange,
  unreadCount,
}: NotificationFilterTabsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Tabs */}
      <Tabs
        value={unreadOnly ? 'unread' : 'all'}
        onValueChange={(val) => onUnreadOnlyChange(val === 'unread')}
        className="w-full sm:w-auto"
      >
        <TabsList className="grid grid-cols-2 w-full sm:w-auto">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-1.5">
            <span>Chưa đọc</span>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 text-[11px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Type Filter */}
      <div className="w-full sm:w-48">
        <Select
          value={type ?? 'all'}
          onValueChange={(val) => onTypeChange(val === 'all' ? undefined : (val as NotificationType))}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Lọc theo loại" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
