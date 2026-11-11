import type { CatalogItemType, OrderStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

const labels: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending_payment: { label: 'Chờ thanh toán', tone: 'warning' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
};

export const orderStatusBadge = (status: OrderStatus) => labels[status];

// Token classes only (theme.css): packages in the info blue, single services in the brand accent.
const itemTypes: Record<CatalogItemType, { label: string; className: string }> = {
  package: {
    label: 'Gói liệu trình',
    className: 'border-transparent bg-status-info text-status-info-foreground',
  },
  service: {
    label: 'Dịch vụ lẻ',
    className: 'border-transparent bg-accent text-accent-foreground',
  },
};

/** Label and colors of an order line's product type, for a `Badge`. */
export const orderItemTypeBadge = (type: CatalogItemType) => itemTypes[type];
