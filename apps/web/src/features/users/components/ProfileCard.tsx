import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ApiClientError, usersErrorCodes } from '@spa/api-client';
import type { MeDto } from '@spa/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { profileSchema, type ProfileFormValues } from '../schemas';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { AvatarUploader } from './AvatarUploader';

interface ProfileCardProps {
  user: MeDto;
}

const roleNames: Record<string, string> = {
  customer: 'Khách hàng',
  staff: 'Kỹ thuật viên',
  owner: 'Chủ cơ sở',
};

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function ProfileCard({ user }: ProfileCardProps) {
  const updateMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName ?? '',
      phoneNumber: user.phoneNumber ?? '',
      dateOfBirth: user.dateOfBirth ?? '',
      gender: user.gender ?? null,
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateMutation.mutateAsync({
        fullName: values.fullName.trim(),
        phoneNumber: user.phoneNumber ?? values.phoneNumber ?? '',
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth : null,
        gender: values.gender ?? null,
      });
      toast.success('Cập nhật thông tin thành công.');
    } catch (error) {
      if (error instanceof ApiClientError) {
        let handled = false;
        for (const err of error.errors) {
          if (
            err.code === usersErrorCodes.duplicatePhoneNumber ||
            err.code === 'phone_exists' ||
            err.code === 'duplicate_phone'
          ) {
            toast.error('Số điện thoại đã được sử dụng bởi tài khoản khác.');
            handled = true;
          } else if (err.field) {
            const field = err.field.charAt(0).toLowerCase() + err.field.slice(1);
            if (field === 'fullName' || field === 'dateOfBirth' || field === 'gender') {
              setError(field as keyof ProfileFormValues, { message: err.message });
              handled = true;
            }
          }
        }
        if (!handled) {
          toast.error(error.message || 'Không thể cập nhật thông tin.');
        }
      } else {
        toast.error('Đã xảy ra lỗi, vui lòng thử lại sau.');
      }
    }
  };

  const isBusy = isSubmitting || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin cá nhân</CardTitle>
        <CardDescription>
          Quản lý ảnh đại diện và thông tin liên hệ của bạn tại Như Nguyệt Spa.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <AvatarUploader avatarUrl={user.avatarUrl} fullName={user.fullName} />

        <div className="h-px bg-border" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                readOnly
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">Email đăng nhập không thể thay đổi.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Vai trò</Label>
              <Input
                id="role"
                value={roleNames[user.role] ?? user.role}
                disabled
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">
                Họ và tên <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                {...register('fullName')}
                disabled={isBusy}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Số điện thoại</Label>
              <Input
                id="phoneNumber"
                value={user.phoneNumber ?? ''}
                disabled
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Ngày sinh</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
                disabled={isBusy}
                aria-invalid={!!errors.dateOfBirth}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Giới tính</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'none'}
                    onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                    disabled={isBusy}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Chọn giới tính" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa xác định</SelectItem>
                      <SelectItem value="female">Nữ</SelectItem>
                      <SelectItem value="male">Nam</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>
          </div>

          <div className="pt-1 text-xs text-muted-foreground">
            Ngày tham gia:{' '}
            <span className="font-medium text-foreground">{formatDate(user.createdAtUtc)}</span>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isBusy} className="gap-2">
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu thông tin
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
