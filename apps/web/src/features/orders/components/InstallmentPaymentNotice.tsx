import { CalendarClockIcon, ShieldCheckIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PackagePayment } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatting/formatters';
import { cn } from '@/lib/utils';
import { checkoutPath } from '../checkoutParams';

/**
 * Payment progress of a package bought in installments (BR-INS-06): which sessions are paid, and a button to pay the next
 * installment, which unlocks the following sessions. Renders nothing for a package paid in full.
 */
export function InstallmentPaymentNotice({
  payment,
  compact = false,
}: {
  payment: PackagePayment | null;
  compact?: boolean;
}) {
  if (!payment || payment.plan !== 'installment') return null;
  const next = payment.nextInstallment;
  const paidAll = payment.paidSessionCount >= payment.totalSessions;
  const progress = paidAll
    ? 'Đã thanh toán đủ các buổi của gói.'
    : `Đã thanh toán ${payment.paidSessionCount}/${payment.totalSessions} buổi.`;

  if (compact)
    return next ? (
      <Button asChild size="sm" variant="outline" className="font-medium">
        <Link to={checkoutPath({ orderId: next.orderId })}>
          <ShieldCheckIcon aria-hidden="true" />
          Thanh toán đợt {next.sequenceNumber} ({formatCurrency(next.amount)})
        </Link>
      </Button>
    ) : null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4',
        next ? 'border-status-info bg-status-info/30' : 'bg-muted/40',
      )}
    >
      <div className="flex items-start gap-3">
        <CalendarClockIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-0.5 text-sm">
          <p className="font-medium text-foreground">Gói thanh toán theo đợt. {progress}</p>
          {next && (
            <p className="text-muted-foreground">
              Thanh toán đợt {next.sequenceNumber} để mở buổi {next.firstSessionNumber}–
              {next.lastSessionNumber}.
            </p>
          )}
        </div>
      </div>
      {next && (
        <Button asChild size="sm" className="font-medium">
          <Link to={checkoutPath({ orderId: next.orderId })}>
            <ShieldCheckIcon aria-hidden="true" />
            Thanh toán đợt {next.sequenceNumber} ({formatCurrency(next.amount)})
          </Link>
        </Button>
      )}
    </div>
  );
}
