import type { PaymentStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

const labels: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Đang xử lý', tone: 'info' },
  succeeded: { label: 'Thành công', tone: 'success' },
  failed: { label: 'Thất bại', tone: 'danger' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
};

export const paymentStatusBadge = (status: PaymentStatus) => labels[status];
