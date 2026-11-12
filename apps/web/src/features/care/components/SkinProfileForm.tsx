import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { SkinProfile } from '@spa/shared-types';
import { FormField } from '@/components/shared/FormField/FormField';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { skinTypeOptions } from '../careLabels';
import { careErrorKind, careErrorMessage } from '../errors';
import { useCreateSkinProfile, useUpdateSkinProfile } from '../hooks/useCareMutations';
import {
  SKIN_PROFILE_TEXT_MAX,
  skinProfileSchema,
  toSkinProfileRequest,
  type SkinProfileOutput,
  type SkinProfileValues,
} from '../schemas';

type TextField = Exclude<keyof SkinProfileValues, 'skinType'>;

const textFields: readonly { name: TextField; label: string; placeholder: string }[] = [
  {
    name: 'mainConcerns',
    label: 'Vấn đề chính',
    placeholder: 'Ví dụ: mụn ẩn vùng trán, da xỉn màu',
  },
  {
    name: 'currentProducts',
    label: 'Sản phẩm đang dùng',
    placeholder: 'Sản phẩm khách đang dùng ở nhà',
  },
  { name: 'careGoals', label: 'Mục tiêu chăm sóc', placeholder: 'Khách mong muốn điều gì' },
  {
    name: 'recommendedTreatment',
    label: 'Liệu trình đề xuất',
    placeholder: 'Dịch vụ hoặc gói phù hợp',
  },
  { name: 'note', label: 'Ghi chú', placeholder: 'Lưu ý khác cho các buổi sau' },
];

/** What the tab does after an answer: back to the view, or lock editing (`skin_profile_locked`). */
export type SkinProfileFormOutcome = 'saved' | 'locked' | 'cancelled';

/** Create (`profile = null`) or replace every field of a visit's skin profile (UC-SPA-27). */
export function SkinProfileForm({
  appointmentId,
  profile,
  onDone,
}: {
  appointmentId: string;
  profile: SkinProfile | null;
  onDone: (outcome: SkinProfileFormOutcome) => void;
}) {
  const createMutation = useCreateSkinProfile();
  const updateMutation = useUpdateSkinProfile();
  const pending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<SkinProfileValues, unknown, SkinProfileOutput>({
    resolver: zodResolver(skinProfileSchema),
    defaultValues: {
      skinType: profile?.skinType,
      mainConcerns: profile?.mainConcerns ?? '',
      currentProducts: profile?.currentProducts ?? '',
      careGoals: profile?.careGoals ?? '',
      recommendedTreatment: profile?.recommendedTreatment ?? '',
      note: profile?.note ?? '',
    },
  });

  const watched = useWatch({ control: form.control });

  const onError = (error: Error) => {
    switch (careErrorKind(error)) {
      case 'too_early':
        toast.error('Chỉ lập hồ sơ da từ ngày hẹn.');
        return;
      case 'locked':
        toast.error('Đã quá thời hạn sửa hồ sơ da.');
        onDone('locked');
        return;
      case 'exists':
        toast.error('Buổi này đã có hồ sơ da.');
        onDone('saved');
        return;
      case 'profile_missing':
        toast.error('Không tìm thấy hồ sơ da, trang đã được tải lại.');
        onDone('cancelled');
        return;
      case 'validation':
        toast.error(careErrorMessage(error) ?? 'Dữ liệu hồ sơ da không hợp lệ.');
        return;
      default:
        toast.error(careErrorMessage(error) ?? 'Không lưu được hồ sơ da, vui lòng thử lại.');
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    const variables = {
      appointmentId,
      skinProfileId: profile?.id ?? null,
      body: toSkinProfileRequest(values),
    };
    const onSuccess = () => {
      toast.success(profile ? 'Đã cập nhật hồ sơ da.' : 'Đã lập hồ sơ da.');
      onDone('saved');
    };
    if (profile) updateMutation.mutate(variables, { onSuccess, onError });
    else createMutation.mutate(variables, { onSuccess, onError });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <Controller
        control={form.control}
        name="skinType"
        render={({ field, fieldState }) => (
          // FormField wraps the trigger (the focusable control); the content renders in a portal.
          <Select
            value={field.value ?? ''}
            onValueChange={(value) =>
              field.onChange(skinTypeOptions.find((option) => option.value === value)?.value)
            }
          >
            <FormField
              label="Loại da"
              required
              error={fieldState.error?.message}
              className="sm:w-64"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn loại da" />
              </SelectTrigger>
            </FormField>
            <SelectContent>
              {skinTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {textFields.map((field) => (
          <FormField
            key={field.name}
            label={field.label}
            error={form.formState.errors[field.name]?.message}
            hint={`${(watched[field.name] ?? '').length}/${SKIN_PROFILE_TEXT_MAX} ký tự`}
          >
            <Textarea rows={3} placeholder={field.placeholder} {...form.register(field.name)} />
          </FormField>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Hồ sơ da ghi nhận tình trạng da để chăm sóc spa, không phải chẩn đoán y khoa.
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onDone('cancelled')}
          disabled={pending}
        >
          Hủy
        </Button>
        <Button type="submit" loading={pending}>
          Lưu hồ sơ
        </Button>
      </div>
    </form>
  );
}
