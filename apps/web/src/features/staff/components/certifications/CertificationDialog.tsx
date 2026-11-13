import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiClientError, errorCodeOf, staffCertificationErrorCodes } from '@spa/api-client';
import type { SaveStaffCertificationRequest, StaffCertification } from '@spa/shared-types';
import { FormField } from '@/components/shared/FormField/FormField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { vietnamNow } from '@/lib/formatting/vietnamTime';
import type { CertificationActions } from '../../hooks/useStaffCertifications';
import { certificationSchema, type CertificationFormValues } from '../../schemas';
import { certificationImageErrorMessage } from './certificationImageFile';
import { CertificationImagePicker } from './CertificationImagePicker';

/** Which certification the dialog edits; `certification = null` adds one. */
export interface CertificationDialogTarget {
  certification: StaffCertification | null;
}

const fieldsByServerName: Record<string, keyof CertificationFormValues> = {
  Name: 'name',
  Issuer: 'issuer',
  CredentialNumber: 'credentialNumber',
  IssuedOn: 'issuedOn',
  ExpiresOn: 'expiresOn',
  Note: 'note',
};

export function CertificationDialog({
  target,
  actions,
  reviewNotice,
  onClose,
  onMissing,
}: {
  target: CertificationDialogTarget | null;
  actions: CertificationActions;
  /** Shown for staff: their writes wait for the owner. */
  reviewNotice?: string;
  onClose: () => void;
  onMissing: () => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {target && (
          <CertificationForm
            key={target.certification?.id ?? 'new'}
            certification={target.certification}
            actions={actions}
            reviewNotice={reviewNotice}
            onClose={onClose}
            onMissing={onMissing}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CertificationForm({
  certification,
  actions,
  reviewNotice,
  onClose,
  onMissing,
}: {
  certification: StaffCertification | null;
  actions: CertificationActions;
  reviewNotice?: string;
  onClose: () => void;
  onMissing: () => void;
}) {
  const form = useForm<CertificationFormValues>({
    resolver: zodResolver(certificationSchema(vietnamNow().date)),
    defaultValues: {
      name: certification?.name ?? '',
      issuer: certification?.issuer ?? '',
      credentialNumber: certification?.credentialNumber ?? '',
      issuedOn: certification?.issuedOn ?? '',
      expiresOn: certification?.expiresOn ?? '',
      isPublic: certification?.isPublic ?? true,
      note: certification?.note ?? '',
    },
  });
  const { errors } = form.formState;
  const [imageFile, setImageFile] = useState<File | null>(null);

  /** The certification is saved first; the photo needs its id. A failed photo keeps the saved certification. */
  const save = useMutation({
    mutationFn: async (body: SaveStaffCertificationRequest) => {
      const saved = certification
        ? await actions.update(certification.id, body)
        : await actions.create(body);
      if (!imageFile) return { imageFailure: null };
      try {
        await actions.uploadImage(saved.id, imageFile);
        return { imageFailure: null };
      } catch (error) {
        return { imageFailure: certificationImageErrorMessage(error) };
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const body: SaveStaffCertificationRequest = {
      name: values.name.trim(),
      issuer: values.issuer.trim() || null,
      credentialNumber: values.credentialNumber.trim() || null,
      issuedOn: values.issuedOn || null,
      expiresOn: values.expiresOn || null,
      isPublic: values.isPublic,
      note: values.note.trim() || null,
    };
    save.mutate(body, {
      onSuccess: ({ imageFailure }) => {
        const saved = certification ? 'Đã cập nhật bằng cấp' : 'Đã thêm bằng cấp';
        if (imageFailure)
          toast.warning(
            `${saved} nhưng chưa tải được ảnh: ${imageFailure} Hãy thử lại ở thẻ bằng.`,
          );
        else toast.success(`${saved}.`);
        onClose();
      },
      onError: (error) => {
        const code = errorCodeOf(error);
        if (code === staffCertificationErrorCodes.notFound) {
          toast.error('Không tìm thấy bằng này, danh sách đã được tải lại.');
          onMissing();
          return onClose();
        }
        if (error instanceof ApiClientError) {
          const matched = error.errors.filter(
            (item) => item.field && fieldsByServerName[item.field],
          );
          for (const item of matched)
            form.setError(fieldsByServerName[item.field ?? ''] ?? 'name', {
              message: item.message,
            });
          if (matched.length > 0) return;
          return void toast.error(error.errors[0]?.message ?? 'Không lưu được, vui lòng thử lại.');
        }
        toast.error('Không lưu được, vui lòng thử lại.');
      },
    });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {certification ? 'Sửa bằng cấp, chứng chỉ' : 'Thêm bằng cấp, chứng chỉ'}
        </DialogTitle>
        <DialogDescription>
          {reviewNotice ?? 'Bằng do chủ spa ghi nhận được duyệt ngay.'}
        </DialogDescription>
      </DialogHeader>

      <FormField label="Tên bằng/chứng chỉ" required error={errors.name?.message}>
        <Input placeholder="Ví dụ: Chứng chỉ chăm sóc da" {...form.register('name')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nơi cấp" error={errors.issuer?.message}>
          <Input {...form.register('issuer')} />
        </FormField>
        <FormField label="Số hiệu" error={errors.credentialNumber?.message}>
          <Input {...form.register('credentialNumber')} />
        </FormField>
        <FormField label="Ngày cấp" error={errors.issuedOn?.message}>
          <Input type="date" {...form.register('issuedOn')} />
        </FormField>
        <FormField
          label="Ngày hết hạn"
          hint="Để trống nếu không có thời hạn"
          error={errors.expiresOn?.message}
        >
          <Input type="date" {...form.register('expiresOn')} />
        </FormField>
      </div>
      <FormField label="Ghi chú nội bộ" error={errors.note?.message}>
        <Textarea rows={2} {...form.register('note')} />
      </FormField>
      <CertificationImagePicker
        value={imageFile}
        currentUrl={certification?.imageUrl ?? null}
        disabled={save.isPending}
        onChange={setImageFile}
      />
      <Controller
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="certification-is-public"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <Label htmlFor="certification-is-public" className="font-normal">
              Hiển thị tên bằng cho khách
            </Label>
          </div>
        )}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          Hủy
        </Button>
        <Button type="submit" loading={save.isPending}>
          Lưu
        </Button>
      </DialogFooter>
    </form>
  );
}
