import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppInput } from '@components/common/AppInput';
import { AppButton } from '@components/common/AppButton';
const schema = z.object({ email: z.email('Vui lòng nhập email hợp lệ') });
export function AuthPlaceholderScreen({ title }: { title: string }) {
  const {
    control,
    trigger,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });
  return (
    <AppScreen>
      <AppText accessibilityRole="header">{title}</AppText>
      <AppText>
        Tính năng đang được phát triển. Form chỉ minh họa kiểm tra dữ liệu trên thiết bị.
      </AppText>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <AppInput
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
          />
        )}
      />
      <AppButton
        title="Kiểm tra định dạng email"
        onPress={() => {
          void trigger();
        }}
      />
      <AppText>Chưa có đăng nhập, đăng ký hoặc gửi dữ liệu lên máy chủ.</AppText>
    </AppScreen>
  );
}
