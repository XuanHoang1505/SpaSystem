import { Navigate, useParams } from 'react-router-dom';
import { MyPackageDetailView } from '@/features/purchases';

export function MyPackageDetailPage() {
  const { packageId } = useParams();
  return packageId ? (
    <MyPackageDetailView packageId={packageId} />
  ) : (
    <Navigate to="/my-packages" replace />
  );
}
