import { OwnerPromotionsView } from '@/features/promotions';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerPromotionsPage() {
  useDocumentTitle('Quản lý khuyến mãi');
  return <OwnerPromotionsView />;
}
