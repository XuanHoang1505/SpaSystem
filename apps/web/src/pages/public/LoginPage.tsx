import { LoginForm } from '@/features/auth/components/LoginForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LoginPage() {
  useDocumentTitle('Đăng nhập');
  return <LoginForm />;
}
