import type { OwnerOrderPayment } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { paymentStatusBadge } from '@/features/payments/paymentStatus';
import { formatCurrency, formatDateTimeUtc } from '@/lib/formatting/formatters';

/** Payment attempts of an order, newest first, with the gateway references the owner needs. */
export function OwnerPaymentList({ payments }: { payments: readonly OwnerOrderPayment[] }) {
  if (payments.length === 0)
    return <p className="text-sm text-muted-foreground">Chưa có lần thanh toán nào.</p>;
  const newestFirst = [...payments].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));
  return (
    <ul className="space-y-3">
      {newestFirst.map((payment) => (
        <li key={payment.id} className="space-y-2 rounded-xl border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">
              {payment.provider.toUpperCase()} · {formatCurrency(payment.amount)}
            </span>
            <StatusBadge {...paymentStatusBadge(payment.status)} status={payment.status} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Tạo lúc</dt>
            <dd>{formatDateTimeUtc(payment.createdAtUtc)}</dd>
            <dt className="text-muted-foreground">Hết hạn lúc</dt>
            <dd>{formatDateTimeUtc(payment.expiresAtUtc)}</dd>
            {payment.paidAtUtc && (
              <>
                <dt className="text-muted-foreground">Thanh toán lúc</dt>
                <dd>{formatDateTimeUtc(payment.paidAtUtc)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Mã yêu cầu</dt>
            <dd className="font-mono break-all">{payment.requestCode}</dd>
            <dt className="text-muted-foreground">Mã giao dịch</dt>
            <dd className="font-mono break-all">
              {payment.providerTransactionId ?? (
                <span className="font-sans text-muted-foreground">Chưa có</span>
              )}
            </dd>
          </dl>
        </li>
      ))}
    </ul>
  );
}
