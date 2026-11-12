import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiClientError, errorCodeOf, usersErrorCodes } from '@spa/api-client';
import type { Gender, UserDetail } from '@spa/shared-types';
import { FormField } from '@/components/shared/FormField/FormField';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roleLabels } from '@/features/auth/navigation';
import { useUpdateOwnerUser } from '../../hooks/useOwnerUsers';
import { ownerUserSchema, type OwnerUserFormValues } from '../../schemas';
import { genderLabels } from '../../userStatus';

const genders: readonly Gender[] = ['male', 'female', 'other'];
const NO_GENDER = 'none';
const formFields: Record<string, keyof OwnerUserFormValues> = {
  FullName: 'fullName',
  DateOfBirth: 'dateOfBirth',
  Gender: 'gender',
};

/** UC-SPA-05 A1: name, date of birth and gender; email, phone and role are read-only (login identifiers). */
export function EditUserDialog({
  user,
  onClose,
  onNotFound,
}: {
  user: UserDetail | null;
  onClose: () => void;
  onNotFound: () => void;
}) {
  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby="edit-user-description">
        {user && (
          <EditUserForm key={user.id} user={user} onClose={onClose} onNotFound={onNotFound} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  onClose,
  onNotFound,
}: {
  user: UserDetail;
  onClose: () => void;
  onNotFound: () => void;
}) {
  const mutation = useUpdateOwnerUser();
  const form = useForm<OwnerUserFormValues>({
    resolver: zodResolver(ownerUserSchema),
    defaultValues: {
      fullName: user.fullName,
      dateOfBirth: user.dateOfBirth ?? '',
      gender: user.gender ?? null,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(
      {
        id: user.id,
        body: {
          fullName: values.fullName.trim(),
          // The phone is a login identifier: send the current one back unchanged (decision 12/11/2026).
          phoneNumber: user.phoneNumber,
          dateOfBirth: values.dateOfBirth || null,
          gender: values.gender ?? null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật tài khoản.');
          onClose();
        },
        onError: (error) => {
          const code = errorCodeOf(error);
          if (code === usersErrorCodes.userNotFound) {
            toast.error('Không tìm thấy tài khoản.');
            onClose();
            onNotFound();
            return;
          }
          if (error instanceof ApiClientError) {
            const fieldErrors = error.errors.filter((item) => item.field && formFields[item.field]);
            for (const item of fieldErrors)
              form.setError(formFields[item.field ?? ''] ?? 'fullName', { message: item.message });
            if (fieldErrors.length > 0) return;
          }
          toast.error(
            (error instanceof ApiClientError && error.errors[0]?.message) ||
              'Không lưu được thay đổi, vui lòng thử lại.',
          );
        },
      },
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Sửa thông tin tài khoản</DialogTitle>
        <DialogDescription id="edit-user-description">
          Email và số điện thoại dùng để đăng nhập nên không đổi ở đây.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Họ tên" required error={form.formState.errors.fullName?.message}>
        <Input autoComplete="off" {...form.register('fullName')} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email">
          <Input value={user.email} disabled readOnly />
        </FormField>
        <FormField label="Số điện thoại">
          <Input value={user.phoneNumber} disabled readOnly />
        </FormField>
        <FormField label="Ngày sinh" error={form.formState.errors.dateOfBirth?.message}>
          <Input type="date" {...form.register('dateOfBirth')} />
        </FormField>
        <Controller
          control={form.control}
          name="gender"
          render={({ field }) => (
            <Select
              value={field.value ?? NO_GENDER}
              onValueChange={(value) =>
                field.onChange(genders.find((item) => item === value) ?? null)
              }
            >
              <FormField label="Giới tính" error={form.formState.errors.gender?.message}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chưa chọn" />
                </SelectTrigger>
              </FormField>
              <SelectContent>
                <SelectItem value={NO_GENDER}>Chưa chọn</SelectItem>
                {genders.map((item) => (
                  <SelectItem key={item} value={item}>
                    {genderLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FormField label="Vai trò">
          <Input value={roleLabels[user.role]} disabled readOnly />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Hủy
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Lưu thay đổi
        </Button>
      </DialogFooter>
    </form>
  );
}
