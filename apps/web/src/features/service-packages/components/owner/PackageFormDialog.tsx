import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { ApiClientError, catalogErrorCodes, errorCodeOf } from '@spa/api-client';
import type {
  CreatePackageRequest,
  PackageDetail,
  PackageItemRequest,
  UpdatePackageRequest,
} from '@spa/shared-types';
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
import { useServiceSearch } from '@/features/services';
import { formatCurrency } from '@/lib/formatting/formatters';
import { savingPercent } from '../../coursePlan';
import { usePackage } from '../../hooks/usePackage';
import { useCreatePackage, useUpdatePackage } from '../../hooks/usePackageMutations';
import {
  packageFormSchema,
  type PackageFormInput,
  type PackageFormValues,
} from '../../schemas';

const VALIDITY_PRESETS = [30, 60, 90, 180, 365] as const;

export interface PackageFormDialogProps {
  packageId?: string | null;
  initialData?: PackageDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (pkg: PackageDetail) => void;
}

export function PackageFormDialog({
  packageId,
  initialData,
  open,
  onOpenChange,
  onSuccess,
}: PackageFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const detailQuery = usePackage(packageId ?? '', Boolean(packageId) && open);
  const currentPackage = initialData ?? (packageId ? detailQuery.data : null);
  const isEditing = Boolean(currentPackage || packageId);

  const servicesQuery = useServiceSearch({ status: 'on_sale', pageSize: 100 });
  const activeServices = useMemo(() => servicesQuery.data?.items ?? [], [servicesQuery.data?.items]);

  const serviceOptions = useMemo(() => {
    const list = [...activeServices];
    if (currentPackage?.items) {
      for (const item of currentPackage.items) {
        if (!list.some((s) => s.id === item.spaServiceId)) {
          list.push({
            id: item.spaServiceId,
            name: `${item.serviceName} (Đã ngừng bán)`,
            price: item.servicePrice,
            categoryId: '',
            category: '',
            durationMinutes: 0,
            imageUrl: item.serviceImageUrl,
            status: item.serviceStatus,
            shortDescription: null,
          });
        }
      }
    }
    return list;
  }, [activeServices, currentPackage?.items]);

  const servicePriceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of serviceOptions) {
      map.set(s.id, s.price);
    }
    return map;
  }, [serviceOptions]);

  const createMutation = useCreatePackage();
  const updateMutation = useUpdatePackage();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PackageFormInput, unknown, PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: '',
      price: 0,
      validityDays: 90,
      shortDescription: '',
      description: '',
      saleStartDate: '',
      saleEndDate: '',
      items: [
        {
          spaServiceId: '',
          sessionCount: 1,
          sortOrder: 1,
          minDaysBetweenSessions: 0,
          note: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedPrice = watch('price');
  const watchedValidityDays = watch('validityDays');
  const watchedItems = watch('items');

  // Summary calculations
  const { totalSessions, totalRetailPrice, savings, discountPercent } = useMemo(() => {
    let sessions = 0;
    let retail = 0;
    const items = watchedItems ?? [];
    for (const it of items) {
      const count = Number(it.sessionCount) || 0;
      sessions += count;
      const sPrice = servicePriceMap.get(it.spaServiceId) ?? 0;
      retail += count * sPrice;
    }
    const currentPrice = Number(watchedPrice) || 0;
    const saveAmt = retail > currentPrice ? retail - currentPrice : 0;
    const disc = savingPercent(currentPrice, retail);
    return {
      totalSessions: sessions,
      totalRetailPrice: retail,
      savings: saveAmt,
      discountPercent: disc,
    };
  }, [watchedItems, servicePriceMap, watchedPrice]);

  const prevPackageIdRef = useRef<string | null | undefined>(undefined);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    const packageLoaded = open && currentPackage && prevPackageIdRef.current !== currentPackage.id;

    if (justOpened || packageLoaded) {
      setFormError(null);
      if (currentPackage) {
        reset({
          name: currentPackage.name,
          price: currentPackage.price,
          validityDays: currentPackage.validityDays,
          shortDescription: currentPackage.shortDescription ?? '',
          description: currentPackage.description ?? '',
          saleStartDate: currentPackage.saleStartDate ?? '',
          saleEndDate: currentPackage.saleEndDate ?? '',
          items:
            currentPackage.items.length > 0
              ? currentPackage.items.map((it, idx) => ({
                  spaServiceId: it.spaServiceId,
                  sessionCount: it.sessionCount,
                  sortOrder: it.sortOrder || idx + 1,
                  minDaysBetweenSessions: it.minDaysBetweenSessions,
                  note: it.note ?? '',
                }))
              : [
                  {
                    spaServiceId: serviceOptions[0]?.id ?? '',
                    sessionCount: 1,
                    sortOrder: 1,
                    minDaysBetweenSessions: 0,
                    note: '',
                  },
                ],
        });
      } else if (!packageId) {
        reset({
          name: '',
          price: 0,
          validityDays: 90,
          shortDescription: '',
          description: '',
          saleStartDate: '',
          saleEndDate: '',
          items: [
            {
              spaServiceId: serviceOptions[0]?.id ?? '',
              sessionCount: 1,
              sortOrder: 1,
              minDaysBetweenSessions: 0,
              note: '',
            },
          ],
        });
      }
    }

    wasOpenRef.current = open;
    prevPackageIdRef.current = currentPackage?.id;
  }, [open, currentPackage, packageId, reset, serviceOptions]);

  const onSubmit = async (values: PackageFormValues) => {
    setFormError(null);

    const itemsPayload: PackageItemRequest[] = values.items.map((it, idx) => ({
      spaServiceId: it.spaServiceId,
      sessionCount: Number(it.sessionCount),
      sortOrder: Number(it.sortOrder) || idx + 1,
      minDaysBetweenSessions: Number(it.minDaysBetweenSessions) || 0,
      note: it.note?.trim() || null,
    }));

    try {
      if (currentPackage) {
        const body: UpdatePackageRequest = {
          name: values.name.trim(),
          price: Number(values.price),
          validityDays: Number(values.validityDays),
          shortDescription: values.shortDescription?.trim() || null,
          description: values.description?.trim() || null,
          saleStartDate: values.saleStartDate || null,
          saleEndDate: values.saleEndDate || null,
          items: itemsPayload,
        };

        const updated = await updateMutation.mutateAsync({
          id: currentPackage.id,
          body,
        });

        toast.success(`Cập nhật gói dịch vụ "${updated.name}" thành công.`);
        onSuccess?.(updated);
        onOpenChange(false);
      } else {
        const body: CreatePackageRequest = {
          name: values.name.trim(),
          price: Number(values.price),
          validityDays: Number(values.validityDays),
          shortDescription: values.shortDescription?.trim() || null,
          description: values.description?.trim() || null,
          saleStartDate: values.saleStartDate || null,
          saleEndDate: values.saleEndDate || null,
          status: 'on_sale',
          items: itemsPayload,
        };

        const created = await createMutation.mutateAsync(body);

        toast.success(`Tạo gói dịch vụ "${created.name}" thành công.`);
        onSuccess?.(created);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === catalogErrorCodes.packageServiceNotFound) {
        setFormError('Một trong các dịch vụ thành phần được chọn không tồn tại.');
      } else if (code === catalogErrorCodes.packageServiceDiscontinued) {
        setFormError('Không thể tạo hoặc cập nhật gói có dịch vụ đã ngừng bán.');
      } else if (err instanceof ApiClientError) {
        setFormError(err.message);
      } else {
        setFormError('Đã xảy ra lỗi khi lưu gói dịch vụ. Vui lòng thử lại.');
      }
    }
  };

  const handleAddItem = () => {
    append({
      spaServiceId: serviceOptions[0]?.id ?? '',
      sessionCount: 1,
      sortOrder: fields.length + 1,
      minDaysBetweenSessions: 0,
      note: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Sửa thông tin gói dịch vụ' : 'Tạo gói dịch vụ mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Cập nhật giá bán, thời hạn và cấu hình các buổi dịch vụ trong gói.'
              : 'Tạo gói liệu trình kết hợp nhiều buổi dịch vụ với giá ưu đãi cho khách hàng.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Thông tin chung
            </h4>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-name">
                Tên gói dịch vụ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pkg-name"
                placeholder="Ví dụ: Gói Chăm sóc da toàn diện 5 buổi"
                {...register('name')}
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Price & Validity Days */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-price">
                  Giá gói (VNĐ) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  {...register('price')}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Xem trước: <strong className="text-foreground">{formatCurrency(Number(watchedPrice) || 0)}</strong>
                </p>
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pkg-validity">
                  Thời hạn sử dụng (ngày) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pkg-validity"
                  type="number"
                  min="1"
                  max="3650"
                  placeholder="90"
                  {...register('validityDays')}
                  disabled={isPending}
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {VALIDITY_PRESETS.map((days) => (
                    <Button
                      key={days}
                      type="button"
                      variant={Number(watchedValidityDays) === days ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setValue('validityDays', days, { shouldValidate: true })}
                      disabled={isPending}
                    >
                      {days} ngày
                    </Button>
                  ))}
                </div>
                {errors.validityDays && (
                  <p className="text-xs text-destructive">{errors.validityDays.message}</p>
                )}
              </div>
            </div>

            {/* Sale Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-start-date">Ngày bắt đầu mở bán</Label>
                <Input
                  id="pkg-start-date"
                  type="date"
                  {...register('saleStartDate')}
                  disabled={isPending}
                />
                <p className="text-[11px] text-muted-foreground">Để trống nếu mở bán ngay lập tức</p>
                {errors.saleStartDate && (
                  <p className="text-xs text-destructive">{errors.saleStartDate.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pkg-end-date">Ngày kết thúc mở bán</Label>
                <Input
                  id="pkg-end-date"
                  type="date"
                  {...register('saleEndDate')}
                  disabled={isPending}
                />
                <p className="text-[11px] text-muted-foreground">Để trống nếu không giới hạn ngày kết thúc</p>
                {errors.saleEndDate && (
                  <p className="text-xs text-destructive">{errors.saleEndDate.message}</p>
                )}
              </div>
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-short-desc">Mô tả ngắn</Label>
              <Input
                id="pkg-short-desc"
                placeholder="Tóm tắt ngắn gọn lợi ích hoặc điểm nổi bật của gói (tối đa 300 ký tự)"
                maxLength={300}
                {...register('shortDescription')}
                disabled={isPending}
              />
              {errors.shortDescription && (
                <p className="text-xs text-destructive">{errors.shortDescription.message}</p>
              )}
            </div>

            {/* Full Description */}
            <div className="space-y-1.5">
              <Label htmlFor="pkg-desc">Mô tả chi tiết</Label>
              <Textarea
                id="pkg-desc"
                rows={3}
                placeholder="Mô tả chi tiết đối tượng phù hợp, quyền lợi, điều kiện áp dụng..."
                maxLength={4000}
                {...register('description')}
                disabled={isPending}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Component Services Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Dịch vụ thành phần ({fields.length}) <span className="text-destructive">*</span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  Thêm các buổi dịch vụ tạo nên gói liệu trình và quy định thứ tự, giãn cách.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                disabled={isPending || fields.length >= 20}
                className="gap-1.5 text-xs"
              >
                <PlusIcon className="size-3.5" />
                Thêm dịch vụ
              </Button>
            </div>

            {errors.items?.root && (
              <p className="text-xs text-destructive">{errors.items.root.message}</p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => {
                const currentSpaServiceId = watch(`items.${index}.spaServiceId`);
                const matchedService = serviceOptions.find((s) => s.id === currentSpaServiceId);

                return (
                  <div
                    key={field.id}
                    className="relative space-y-3 rounded-xl border bg-muted/20 p-3.5 sm:p-4"
                  >
                    <div className="flex items-center justify-between gap-2 border-b pb-2">
                      <span className="text-xs font-semibold text-foreground">
                        Dòng {index + 1}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={isPending}
                          className="size-7 p-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Xóa dòng dịch vụ ${index + 1}`}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                      {/* Select Service */}
                      <div className="space-y-1 sm:col-span-6">
                        <Label className="text-xs">
                          Chọn dịch vụ <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={currentSpaServiceId || ''}
                          onValueChange={(val) =>
                            setValue(`items.${index}.spaServiceId`, val, { shouldValidate: true })
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="-- Chọn dịch vụ spa --" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceOptions.map((svc) => (
                              <SelectItem key={svc.id} value={svc.id} className="text-xs">
                                {svc.name} — {formatCurrency(svc.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {matchedService && (
                          <p className="text-[11px] text-muted-foreground">
                            Đơn giá lẻ: <strong className="text-foreground">{formatCurrency(matchedService.price)}</strong> / buổi
                          </p>
                        )}
                        {errors.items?.[index]?.spaServiceId && (
                          <p className="text-xs text-destructive">
                            {errors.items[index]?.spaServiceId?.message}
                          </p>
                        )}
                      </div>

                      {/* Session Count */}
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">
                          Số buổi <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          className="h-9 text-xs"
                          {...register(`items.${index}.sessionCount`)}
                          disabled={isPending}
                        />
                        {errors.items?.[index]?.sessionCount && (
                          <p className="text-xs text-destructive">
                            {errors.items[index]?.sessionCount?.message}
                          </p>
                        )}
                      </div>

                      {/* Sort Order */}
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Thứ tự</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          className="h-9 text-xs"
                          {...register(`items.${index}.sortOrder`)}
                          disabled={isPending}
                        />
                        {errors.items?.[index]?.sortOrder && (
                          <p className="text-xs text-destructive">
                            {errors.items[index]?.sortOrder?.message}
                          </p>
                        )}
                      </div>

                      {/* Min days between */}
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Cách (ngày)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="365"
                          className="h-9 text-xs"
                          {...register(`items.${index}.minDaysBetweenSessions`)}
                          disabled={isPending}
                        />
                        {errors.items?.[index]?.minDaysBetweenSessions && (
                          <p className="text-xs text-destructive">
                            {errors.items[index]?.minDaysBetweenSessions?.message}
                          </p>
                        )}
                      </div>

                      {/* Note */}
                      <div className="space-y-1 sm:col-span-12">
                        <Label className="text-xs">Ghi chú cho buổi</Label>
                        <Input
                          placeholder="Ví dụ: Chỉ thực hiện sau khi da đã hồi phục qua bước thanh tẩy"
                          className="h-8 text-xs"
                          {...register(`items.${index}.note`)}
                          disabled={isPending}
                        />
                        {errors.items?.[index]?.note && (
                          <p className="text-xs text-destructive">
                            {errors.items[index]?.note?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Calculation Summary Card */}
            <div className="rounded-xl border bg-card/80 p-4">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase">
                Tóm tắt giá trị gói
              </h5>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <span className="text-xs text-muted-foreground">Tổng số buổi</span>
                  <div className="text-base font-bold text-foreground">
                    {totalSessions} buổi
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tổng giá bán lẻ</span>
                  <div className="text-base font-bold text-foreground">
                    {formatCurrency(totalRetailPrice)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Giá gói</span>
                  <div className="text-base font-bold text-foreground">
                    {formatCurrency(Number(watchedPrice) || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tiết kiệm</span>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {savings > 0 ? (
                      <>
                        {formatCurrency(savings)}{' '}
                        <span className="text-xs font-normal">(-{discountPercent}%)</span>
                      </>
                    ) : (
                      '0 ₫'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Đang lưu...'
                : isEditing
                  ? 'Lưu thay đổi'
                  : 'Tạo gói dịch vụ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
