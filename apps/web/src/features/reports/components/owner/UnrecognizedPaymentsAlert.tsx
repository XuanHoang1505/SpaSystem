import { AlertCircleIcon } from 'lucide-react';
import type { UnrecognizedPaymentsDto } from '@spa/shared-types';
import { formatCurrency } from '@/lib/formatting/formatters';

export interface UnrecognizedPaymentsAlertProps {
  readonly unrecognizedPayments?: UnrecognizedPaymentsDto | null;
}

export function UnrecognizedPaymentsAlert({
  unrecognizedPayments,
}: UnrecognizedPaymentsAlertProps) {
  if (!unrecognizedPayments || unrecognizedPayments.count <= 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50/70 p-4 text-amber-900 shadow-xs dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-200"
    >
      <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="space-y-1 text-sm">
        <h4 className="font-semibold text-amber-900 dark:text-amber-100">
          Phát hiện {unrecognizedPayments.count} giao dịch chưa ghi nhận doanh thu
        </h4>
        <p className="text-amber-800/90 dark:text-amber-200/90">
          Tổng số tiền{' '}
          <strong className="font-semibold text-amber-950 dark:text-amber-50">
            {formatCurrency(unrecognizedPayments.amount)}
          </strong>{' '}
          đã thanh toán thành công trên các đơn bị hủy/hết hạn hoặc là khoản thanh toán lần hai.
          Khoản tiền này được tách riêng và không tính vào doanh thu báo cáo để chủ spa rà soát hoàn
          tiền thủ công (BR-RPT-02).
        </p>
      </div>
    </div>
  );
}
