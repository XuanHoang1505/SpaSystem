import { Link } from 'react-router-dom';
import { Calendar, Clock, User, CalendarPlus } from 'lucide-react';
import type { AiBookingProposal } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';

interface AiBookingProposalCardProps {
  proposal: AiBookingProposal;
}

export function AiBookingProposalCard({ proposal }: AiBookingProposalCardProps) {
  const timeRange = `${formatLocalTime(proposal.startTime)} – ${formatLocalTime(proposal.endTime)}`;
  const dateFormatted = formatLocalDate(proposal.date);

  return (
    <div className="p-3.5 rounded-lg border bg-primary/5 dark:bg-primary/10 border-primary/20 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm text-foreground">{proposal.serviceName}</h4>
        <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Đề xuất lịch trống
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{dateFormatted}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{timeRange}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:col-span-2">
          <User className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{proposal.staffName ? `Kỹ thuật viên: ${proposal.staffName}` : 'Kỹ thuật viên bất kỳ'}</span>
        </div>
      </div>

      <div className="pt-1">
        <Button asChild size="sm" className="w-full gap-2">
          <Link to={proposal.path}>
            <CalendarPlus className="h-4 w-4" />
            Đặt lịch theo đề xuất này
          </Link>
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">
          Giờ hẹn chưa được giữ chỗ. Vui lòng bấm để hoàn tất xác nhận đặt lịch.
        </p>
      </div>
    </div>
  );
}
