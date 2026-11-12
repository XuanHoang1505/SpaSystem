import { OwnerServicesView } from '@/features/services';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerServicesPage() {
  useDocumentTitle('Quản lý dịch vụ');
  return <OwnerServicesView />;
}
