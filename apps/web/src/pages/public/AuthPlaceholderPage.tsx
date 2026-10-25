import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '@components/common/AppInput/AppInput';
import { AppButton } from '@components/common/AppButton/AppButton';
const schema = z.object({ email: z.email('Vui lòng nhập email hợp lệ') });
export function AuthPlaceholderPage({ title }: { title: string }) {
  const {
    register,
    formState: { errors },
    trigger,
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onBlur' });
  return (
    <section className="page auth-preview">
      <p className="eyebrow">BẢN XEM TRƯỚC FORM</p>
      <h1>{title}</h1>
      <p>Tính năng đang được phát triển. Form này chỉ minh họa kiểm tra dữ liệu trên thiết bị.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void trigger();
        }}
      >
        <AppInput
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <AppButton type="submit">Kiểm tra định dạng email</AppButton>
      </form>
      <p className="phase-note">Chưa có đăng nhập, đăng ký hoặc gửi dữ liệu lên máy chủ.</p>
    </section>
  );
}
