import { OwnerPackagesView } from '@/features/service-packages';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerPackagesPage() {
  useDocumentTitle('Quản lý gói dịch vụ');
  return <OwnerPackagesView />;
}
