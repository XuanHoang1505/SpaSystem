import { useParams } from 'react-router-dom';
import { PackageDetailView } from '@/features/service-packages';

export function PackageDetailPage() {
  const { packageId = '' } = useParams();
  return <PackageDetailView key={packageId} packageId={packageId} />;
}
