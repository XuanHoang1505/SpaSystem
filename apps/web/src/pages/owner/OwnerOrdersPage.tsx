import { OwnerOrdersView } from '@/features/orders';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerOrdersPage() {
  useDocumentTitle('Quản lý đơn hàng');
  return <OwnerOrdersView />;
}
