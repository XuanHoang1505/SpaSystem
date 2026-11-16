import { OwnerReviewsView } from '@/features/reviews';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerReviewsPage() {
  useDocumentTitle('Quản lý đánh giá');
  return <OwnerReviewsView />;
}
