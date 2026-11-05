import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OtpSent } from '@spa/shared-types';
import type { RegisterValues } from '../schemas';
import { AuthCard } from './AuthCard';
import { ConfigurationAlert } from './ConfigurationAlert';
import { RegisterDetailsStep, type RegisterFieldError } from './RegisterDetailsStep';
import { RegisterOtpStep } from './RegisterOtpStep';
import { StepIndicator } from './StepIndicator';

/** SCR-W08: two steps on one route, kept in local state (no route per step). */
export function RegisterFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [details, setDetails] = useState<RegisterValues | null>(null);
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [otpLocked, setOtpLocked] = useState(false);
  const [fieldError, setFieldError] = useState<RegisterFieldError | null>(null);
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
      eyebrow={
        <StepIndicator
          current={step}
          total={2}
          label={step === 1 ? 'Thông tin tài khoản' : 'Xác thực email'}
        />
      }
      title="Đăng ký tài khoản"
      description={
        step === 1
          ? 'Nhập thông tin của bạn. Chúng tôi sẽ gửi mã xác thực gồm 6 chữ số tới email.'
          : undefined
      }
      headingRef={heading}
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <ConfigurationAlert />
      {step === 2 && details && sent ? (
        <RegisterOtpStep
          details={details}
          sent={sent}
          locked={otpLocked}
          onLocked={() => setOtpLocked(true)}
          onResent={(next) => {
            setSent(next);
            setOtpLocked(false);
          }}
          onBack={(error) => {
            setFieldError(error ?? null);
            setStep(1);
          }}
        />
      ) : (
        <RegisterDetailsStep
          defaultValues={details}
          resendAvailableAtUtc={sent?.resendAvailableAtUtc ?? null}
          fieldError={fieldError}
          onSent={(values, next) => {
            setDetails(values);
            setSent(next);
            setOtpLocked(false);
            setFieldError(null);
            setStep(2);
          }}
        />
      )}
    </AuthCard>
  );
}
