import { RegisterFlow } from '@/features/auth/components/RegisterFlow';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function RegisterPage() {
  useDocumentTitle('Đăng ký tài khoản');
  return <RegisterFlow />;
}
