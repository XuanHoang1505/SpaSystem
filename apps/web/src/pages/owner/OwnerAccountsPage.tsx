import { OwnerUsersView } from '@/features/users';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerAccountsPage() {
  useDocumentTitle('Tài khoản người dùng');
  return <OwnerUsersView />;
}
