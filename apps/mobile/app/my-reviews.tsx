import { CustomerRoute } from '@components/auth/CustomerRoute';
import { MyReviewsScreen } from '@/features/reviews';

export default function MyReviewsRoute() {
  return (
    <CustomerRoute>
      <MyReviewsScreen />
    </CustomerRoute>
  );
}
