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
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 dark:bg-primary/10">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{proposal.serviceName}</h4>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Đề xuất lịch trống
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{dateFormatted}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{timeRange}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:col-span-2">
          <User className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            {proposal.staffName ? `Kỹ thuật viên: ${proposal.staffName}` : 'Kỹ thuật viên bất kỳ'}
          </span>
        </div>
      </div>

      <div className="pt-1">
        <Button asChild size="sm" className="w-full gap-2">
          <Link to={proposal.path}>
            <CalendarPlus className="h-4 w-4" />
            Đặt lịch theo đề xuất này
          </Link>
        </Button>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Giờ hẹn chưa được giữ chỗ. Vui lòng bấm để hoàn tất xác nhận đặt lịch.
        </p>
      </div>
    </div>
  );
}
