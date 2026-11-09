import type { OrderStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

const labels: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending_payment: { label: 'Chờ thanh toán', tone: 'warning' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' },
};

export const orderStatusBadge = (status: OrderStatus) => labels[status];
