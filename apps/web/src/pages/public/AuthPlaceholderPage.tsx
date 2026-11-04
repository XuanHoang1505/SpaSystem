import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField/FormField';

const schema = z.object({ email: z.email('Vui lòng nhập email hợp lệ') });

export function AuthPlaceholderPage({ title }: { title: string }) {
  const {
    register,
    formState: { errors },
    trigger,
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onBlur' });
  return (
    <section className="mx-auto max-w-md py-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Bản xem trước form
          </p>
          <CardTitle>
            <h1 className="text-3xl">{title}</h1>
          </CardTitle>
          <CardDescription>
            Tính năng đang được phát triển. Form này chỉ minh họa kiểm tra dữ liệu trên thiết bị.
          </CardDescription>
        </CardHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void trigger();
          }}
        >
          <CardContent className="grid gap-4">
            <FormField label="Email" error={errors.email?.message} required>
              <Input type="email" autoComplete="email" {...register('email')} />
            </FormField>
          </CardContent>
          <CardFooter className="mt-6 flex-col items-stretch gap-3">
            <Button type="submit">Kiểm tra định dạng email</Button>
            <p className="text-center text-xs text-muted-foreground">
              Chưa có đăng nhập, đăng ký hoặc gửi dữ liệu lên máy chủ.
            </p>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
