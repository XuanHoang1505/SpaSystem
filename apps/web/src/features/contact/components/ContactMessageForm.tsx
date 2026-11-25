import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SendIcon } from 'lucide-react';
import { toast } from 'sonner';
import { FormField } from '@/components/shared/FormField/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { siteInfo } from '@/config/siteInfo';
import { useAuthStore } from '@/stores/authStore';
import {
  buildContactMailto,
  contactMessageSchema,
  contactTopics,
  MAX_CONTACT_MESSAGE,
  type ContactMessageValues,
} from '../schemas';

/**
 * Writes the visitor's message as an email to the spa in their own mail app (there is no contact API yet, so the
 * system stores nothing). A signed-in user's name and phone are filled in.
 */
export function ContactMessageForm() {
  const user = useAuthStore((state) => state.user);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ContactMessageValues>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      phoneNumber: '',
      topic: 'consult',
      message: '',
    },
  });
  const messageLength = watch('message')?.length ?? 0;

  const onSubmit = (values: ContactMessageValues) => {
    window.location.href = buildContactMailto(siteInfo.email, values);
    toast.success('Đã soạn sẵn email', {
      description: `Kiểm tra ứng dụng email và bấm gửi tới ${siteInfo.email}.`,
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <FormField label="Họ và tên" error={errors.fullName?.message} required>
        <Input autoComplete="name" placeholder="Nguyễn Thị Lan" {...register('fullName')} />
      </FormField>
      <FormField
        label="Số điện thoại"
        hint="Không bắt buộc, để spa gọi lại."
        error={errors.phoneNumber?.message}
      >
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="0901234567"
          {...register('phoneNumber')}
        />
      </FormField>
      <FormField label="Chủ đề" error={errors.topic?.message} required className="sm:col-span-2">
        <Controller
          name="topic"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn chủ đề" />
              </SelectTrigger>
              <SelectContent>
                {contactTopics.map((topic) => (
                  <SelectItem key={topic.value} value={topic.value}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FormField
        label="Lời nhắn"
        hint={`${messageLength}/${MAX_CONTACT_MESSAGE} ký tự`}
        error={errors.message?.message}
        required
        className="sm:col-span-2"
      >
        <Textarea
          rows={5}
          placeholder="Bạn cần spa hỗ trợ điều gì?"
          maxLength={MAX_CONTACT_MESSAGE}
          {...register('message')}
        />
      </FormField>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Nút này mở ứng dụng email của bạn với nội dung đã điền sẵn. Nếu không có ứng dụng email,
          hãy gửi trực tiếp tới{' '}
          <span className="font-medium text-foreground">{siteInfo.email}</span>.
        </p>
        <Button type="submit" className="shrink-0">
          <SendIcon aria-hidden="true" />
          Soạn email gửi spa
        </Button>
      </div>
    </form>
  );
}
