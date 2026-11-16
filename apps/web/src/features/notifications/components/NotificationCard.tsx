import { CheckIcon, ArrowRightIcon, BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  notificationTypeIcons,
  notificationTypeLabels,
  notificationTypeTones,
} from '../types';
import { formatRelativeTime, formatExactDateTime } from '../utils/formatTime';
import { cn } from '@/lib/utils';
import type { NotificationDto } from '@spa/shared-types';

interface NotificationCardProps {
  item: NotificationDto;
  onItemClick: (item: NotificationDto) => void;
  onMarkRead?: (id: string) => void;
  isMarkingRead?: boolean;
}

export function NotificationCard({
  item,
  onItemClick,
  onMarkRead,
  isMarkingRead,
}: NotificationCardProps) {
  const Icon = notificationTypeIcons[item.type] || BellIcon;
  const label = notificationTypeLabels[item.type] || 'Hệ thống';
  const tone = notificationTypeTones[item.type] || 'neutral';

  const handleCardClick = () => {
    onItemClick(item);
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead?.(item.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group relative flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer',
        !item.isRead
          ? 'bg-card border-primary/25 shadow-xs hover:border-primary/50 hover:bg-muted/30'
          : 'bg-card/60 border-border hover:bg-muted/40 hover:border-border/80'
      )}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Type Icon */}
      <div
        className={cn(
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
          !item.isRead
            ? 'bg-primary/10 border-primary/20 text-primary'
            : 'bg-muted/60 border-border text-muted-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <StatusBadge label={label} tone={tone} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(item.createdAtUtc)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{formatExactDateTime(item.createdAtUtc)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <h3
          className={cn(
            'text-sm leading-snug tracking-tight mb-1',
            !item.isRead
              ? 'font-semibold text-foreground'
              : 'font-medium text-foreground/80'
          )}
        >
          {item.title}
        </h3>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {item.body}
        </p>

        {item.referenceType && (
          <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Xem chi tiết</span>
            <ArrowRightIcon className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="absolute right-3 top-3.5 flex items-center gap-1.5">
        {!item.isRead && (
          <>
            <span
              className="h-2.5 w-2.5 rounded-full bg-primary shrink-0"
              title="Chưa đọc"
              aria-label="Chưa đọc"
            />
            {onMarkRead && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleMarkRead}
                      disabled={isMarkingRead}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                      aria-label="Đánh dấu đã đọc"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Đánh dấu đã đọc</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
      </div>
    </div>
  );
}
