import type { CatalogStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

export const catalogStatusBadge: Record<CatalogStatus, { label: string; tone: StatusTone }> = {
  on_sale: { label: 'Đang bán', tone: 'success' },
  discontinued: { label: 'Ngừng bán', tone: 'neutral' },
};
