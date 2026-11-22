import type { InstallmentPreview, OrderInstallment } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { formatCurrency, formatDateTimeUtc } from '@/lib/formatting/formatters';
import { installmentStatusBadge } from '../orderStatus';

const sessions = (first: number, last: number) =>
  first === last ? `Buổi ${first}` : `Buổi ${first}–${last}`;

/**
 * The installments of a plan offered at checkout, as a timeline: the first one is paid today, the others when the
 * customer needs the next sessions. Each shows the sessions it unlocks, their services and the amount.
 */
export function InstallmentTable({
  installments,
}: {
  installments: readonly InstallmentPreview[];
}) {
  return (
    <ol className="rounded-xl border bg-muted/20 px-4 py-1">
      {installments.map((item, index) => (
        <li key={item.sequenceNumber} className="relative flex gap-3 py-3">
          {index < installments.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-9 bottom-0 left-[11px] w-px bg-border"
            />
          )}
          <span
            aria-hidden="true"
            className={
              index === 0
                ? 'grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground'
                : 'grid size-6 shrink-0 place-items-center rounded-full border bg-card text-xs font-semibold text-muted-foreground'
            }
          >
            {item.sequenceNumber}
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Đợt {item.sequenceNumber} · {index === 0 ? 'Hôm nay' : 'Khi cần'}
                <span className="font-normal text-muted-foreground">
                  {' '}
                  · {sessions(item.firstSessionNumber, item.lastSessionNumber)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {item.services
                  .map((service) => `${service.name} × ${service.sessionCount}`)
                  .join(', ')}
              </p>
            </div>
            <p className="font-heading font-semibold text-primary">{formatCurrency(item.amount)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The installments of an order with their status (order detail, existing-order checkout, owner sheet), with the amount
 * paid and left.
 */
export function InstallmentSchedule({
  installments,
  paidAmount,
  remainingAmount,
}: {
  installments: readonly OrderInstallment[];
  paidAmount: number;
  remainingAmount: number;
}) {
  if (installments.length === 0) return null;
  return (
    <section aria-label="Các đợt thanh toán" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Thanh toán theo {installments.length} đợt
        </h3>
        <p className="text-sm text-muted-foreground">
          Đã trả <span className="font-medium text-foreground">{formatCurrency(paidAmount)}</span>
          {remainingAmount > 0 && (
            <>
              {' · '}Còn lại{' '}
              <span className="font-medium text-foreground">{formatCurrency(remainingAmount)}</span>
            </>
          )}
        </p>
      </div>
      <ol className="divide-y rounded-xl border">
        {installments.map((item) => {
          const badge = installmentStatusBadge(item.status);
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  Đợt {item.sequenceNumber}:{' '}
                  {sessions(item.firstSessionNumber, item.lastSessionNumber)}
                </p>
                {item.paidAtUtc && (
                  <p className="text-xs text-muted-foreground">
                    Thanh toán lúc {formatDateTimeUtc(item.paidAtUtc)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatCurrency(item.amount)}</span>
                <StatusBadge label={badge.label} tone={badge.tone} status={item.status} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
