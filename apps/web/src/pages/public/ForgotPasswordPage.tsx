import { ForgotPasswordFlow } from '@/features/auth/components/ForgotPasswordFlow';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ForgotPasswordPage() {
  useDocumentTitle('Quên mật khẩu');
  return <ForgotPasswordFlow />;
}
