import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { MyReviewsView } from '@/features/reviews';

export function MyReviewsPage() {
  useDocumentTitle('Đánh giá của tôi');
  return <MyReviewsView />;
}
