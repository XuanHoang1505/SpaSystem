import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { ApiClientError } from '@spa/api-client';
import type { CreateServiceRequest, ServiceDetail, UpdateServiceRequest } from '@spa/shared-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatting/formatters';
import { useService } from '../../hooks/useService';
import { useServiceCategories } from '../../hooks/useServiceCategories';
import { useCreateService, useUpdateService } from '../../hooks/useServiceMutations';
import {
  serviceFormSchema,
  type ServiceFormInput,
  type ServiceFormValues,
} from '../../schemas';

const DURATION_PRESETS = [30, 45, 60, 90, 120] as const;

export interface ServiceFormDialogProps {
  serviceId?: string | null;
  service?: ServiceDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (service: ServiceDetail) => void;
}

export function ServiceFormDialog({
  serviceId,
  service,
  open,
  onOpenChange,
  onSuccess,
}: ServiceFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const detailQuery = useService(serviceId ?? '', Boolean(serviceId) && open);
  const currentService = service ?? (serviceId ? detailQuery.data : null);
  const isEditing = Boolean(currentService || serviceId);

  const categoriesQuery = useServiceCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceFormInput, unknown, ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      price: 0,
      durationMinutes: 60,
      shortDescription: '',
      description: '',
      steps: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'steps',
  });

  const watchedPrice = watch('price');
  const watchedDuration = watch('durationMinutes');
  const watchedCategoryId = watch('categoryId');

  const prevServiceIdRef = useRef<string | null | undefined>(undefined);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    const serviceLoaded = open && currentService && prevServiceIdRef.current !== currentService.id;

    if (justOpened || serviceLoaded) {
      setFormError(null);
      if (currentService) {
        reset({
          name: currentService.name,
          categoryId: currentService.categoryId,
          price: currentService.price,
          durationMinutes: currentService.durationMinutes,
          shortDescription: currentService.shortDescription ?? '',
          description: currentService.description ?? '',
          steps: currentService.steps.map((s) => ({
            title: s.title,
            durationMinutes: s.durationMinutes,
            description: s.description ?? '',
          })),
        });
      } else if (!serviceId) {
        reset({
          name: '',
          categoryId: categories[0]?.id ?? '',
          price: 0,
          durationMinutes: 60,
          shortDescription: '',
          description: '',
          steps: [],
        });
      }
    }

    wasOpenRef.current = open;
    prevServiceIdRef.current = currentService?.id;
  }, [open, currentService, serviceId, reset, categories]);

  const onSubmit = async (values: ServiceFormValues) => {
    setFormError(null);

    const stepPayload = values.steps.map((st) => ({
      title: st.title.trim(),
      durationMinutes:
        st.durationMinutes !== null && st.durationMinutes !== undefined && !Number.isNaN(st.durationMinutes)
          ? Number(st.durationMinutes)
          : null,
      description: st.description?.trim() || null,
    }));

    try {
      if (currentService) {
        const body: UpdateServiceRequest = {
          name: values.name.trim(),
          categoryId: values.categoryId,
          price: Number(values.price),
          durationMinutes: Number(values.durationMinutes),
          shortDescription: values.shortDescription?.trim() || null,
          description: values.description?.trim() || null,
          steps: stepPayload,
        };

        const updated = await updateMutation.mutateAsync({
          id: currentService.id,
          body,
        });

        toast.success(`Cập nhật dịch vụ "${updated.name}" thành công.`);
        onSuccess?.(updated);
        onOpenChange(false);
      } else {
        const body: CreateServiceRequest = {
          name: values.name.trim(),
          categoryId: values.categoryId,
          price: Number(values.price),
          durationMinutes: Number(values.durationMinutes),
          shortDescription: values.shortDescription?.trim() || null,
          description: values.description?.trim() || null,
          steps: stepPayload,
        };

        const created = await createMutation.mutateAsync(body);

        toast.success(`Tạo dịch vụ "${created.name}" thành công.`);
        onSuccess?.(created);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.errors.length > 0) {
          setFormError(err.errors.map((e) => e.message).join(' '));
        } else {
          setFormError(err.message);
        }
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra, vui lòng thử lại.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Sửa thông tin dịch vụ' : 'Thêm dịch vụ mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Cập nhật thông tin chi tiết dịch vụ spa và các bước quy trình.'
              : 'Nhập thông tin để tạo dịch vụ mới vào danh mục của spa.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Service Name */}
          <div className="space-y-1.5">
            <Label htmlFor="service-name">
              Tên dịch vụ <span className="text-destructive">*</span>
            </Label>
            <Input
              id="service-name"
              placeholder="Ví dụ: Chăm sóc da mặt chuyên sâu"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="service-category">
                Danh mục dịch vụ <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchedCategoryId}
                onValueChange={(val) => setValue('categoryId', val, { shouldValidate: true })}
              >
                <SelectTrigger id="service-category">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="service-price">
                  Giá niêm yết (VNĐ) <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs font-semibold text-primary">
                  {formatCurrency(Number(watchedPrice || 0))}
                </span>
              </div>
              <Input
                id="service-price"
                type="number"
                min={0}
                step={1000}
                placeholder="Ví dụ: 350000"
                {...register('price')}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
          </div>

          {/* Duration with quick presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="service-duration">
                Thời lượng (phút) <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-1">
                {DURATION_PRESETS.map((minutes) => (
                  <Button
                    key={minutes}
                    type="button"
                    variant={Number(watchedDuration) === minutes ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setValue('durationMinutes', minutes, { shouldValidate: true })}
                  >
                    {minutes}p
                  </Button>
                ))}
              </div>
            </div>
            <Input
              id="service-duration"
              type="number"
              min={1}
              max={1440}
              placeholder="60"
              {...register('durationMinutes')}
            />
            {errors.durationMinutes && (
              <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>
            )}
          </div>

          {/* Short Description */}
          <div className="space-y-1.5">
            <Label htmlFor="service-shortDescription">Mô tả ngắn</Label>
            <Input
              id="service-shortDescription"
              placeholder="Mô tả tóm tắt dịch vụ trên danh sách và thẻ xem trước..."
              {...register('shortDescription')}
            />
            {errors.shortDescription && (
              <p className="text-xs text-destructive">{errors.shortDescription.message}</p>
            )}
          </div>

          {/* Long Description */}
          <div className="space-y-1.5">
            <Label htmlFor="service-description">Mô tả chi tiết</Label>
            <Textarea
              id="service-description"
              rows={4}
              placeholder="Mô tả công dụng, công nghệ áp dụng, đối tượng phù hợp..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Procedure Steps dynamic list */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Các bước quy trình</h4>
                <p className="text-xs text-muted-foreground">
                  Trình tự các bước thực hiện dịch vụ cho kỹ thuật viên và khách hàng theo dõi.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    title: '',
                    durationMinutes: null,
                    description: '',
                  })
                }
                className="gap-1.5 text-xs"
              >
                <PlusIcon className="size-3.5" />
                Thêm bước
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                Chưa có bước quy trình nào. Bấm &quot;Thêm bước&quot; để thiết lập quy trình từng bước.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-3 rounded-xl border bg-card/60 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">
                        Bước {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Xóa bước ${index + 1}`}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor={`steps.${index}.title`} className="text-xs">
                          Tiêu đề bước <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`steps.${index}.title`}
                          placeholder="Ví dụ: Làm sạch sâu và tẩy tế bào chết"
                          className="h-8 text-xs"
                          {...register(`steps.${index}.title` as const)}
                        />
                        {errors.steps?.[index]?.title && (
                          <p className="text-[11px] text-destructive">
                            {errors.steps[index]?.title?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`steps.${index}.durationMinutes`} className="text-xs">
                          Thời lượng (phút)
                        </Label>
                        <Input
                          id={`steps.${index}.durationMinutes`}
                          type="number"
                          placeholder="15"
                          min={1}
                          className="h-8 text-xs"
                          {...register(`steps.${index}.durationMinutes` as const)}
                        />
                        {errors.steps?.[index]?.durationMinutes && (
                          <p className="text-[11px] text-destructive">
                            {errors.steps[index]?.durationMinutes?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`steps.${index}.description`} className="text-xs">
                        Chi tiết thực hiện
                      </Label>
                      <Input
                        id={`steps.${index}.description`}
                        placeholder="Mô tả kỹ thuật hoặc sản phẩm sử dụng trong bước này..."
                        className="h-8 text-xs"
                        {...register(`steps.${index}.description` as const)}
                      />
                      {errors.steps?.[index]?.description && (
                        <p className="text-[11px] text-destructive">
                          {errors.steps[index]?.description?.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
