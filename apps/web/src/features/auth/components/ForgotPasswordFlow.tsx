import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OtpSent, PasswordResetToken } from '@spa/shared-types';
import { AuthCard } from './AuthCard';
import { ConfigurationAlert } from './ConfigurationAlert';
import { ForgotEmailStep } from './ForgotEmailStep';
import { ForgotOtpStep } from './ForgotOtpStep';
import { NewPasswordStep } from './NewPasswordStep';
import { StepIndicator } from './StepIndicator';

const labels = { 1: 'Nhập email', 2: 'Nhập mã xác thực', 3: 'Mật khẩu mới' } as const;

/** SCR-W09: three steps on one route; the reset token lives only in this state. */
export function ForgotPasswordFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [reset, setReset] = useState<PasswordResetToken | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  return (
    <AuthCard
      eyebrow={<StepIndicator current={step} total={3} label={labels[step]} />}
      title="Quên mật khẩu"
      description={step === 1 ? 'Nhập email của tài khoản để nhận mã đặt lại mật khẩu.' : undefined}
      headingRef={heading}
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Về đăng nhập
        </Link>
      }
    >
      <ConfigurationAlert />
      {step === 3 && reset ? (
        <NewPasswordStep
          email={email}
          reset={reset}
          onInvalidToken={(message) => {
            setReset(null);
            setNotice(message);
            setStep(1);
          }}
        />
      ) : step === 2 && sent ? (
        <ForgotOtpStep
          email={email}
          sent={sent}
          onVerified={(token) => {
            setReset(token);
            setStep(3);
          }}
          onResent={setSent}
          onChangeEmail={() => setStep(1)}
        />
      ) : (
        <ForgotEmailStep
          key={notice ?? 'email'}
          defaultEmail={email}
          notice={notice}
          onSent={(value, next) => {
            setEmail(value);
            setSent(next);
            setNotice(null);
            setStep(2);
          }}
        />
      )}
    </AuthCard>
  );
}
