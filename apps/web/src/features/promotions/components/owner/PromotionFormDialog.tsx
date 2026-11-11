import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircleIcon, AlertTriangleIcon, InfoIcon, SparklesIcon } from 'lucide-react';
import { ApiClientError, promotionErrorCodes } from '@spa/api-client';
import type { PromotionDto, SavePromotionRequest } from '@spa/shared-types';
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
import { formatCurrency } from '@/lib/formatting/formatters';
import { toast } from 'sonner';
import { usePromotion } from '../../hooks/usePromotions';
import { useCreatePromotion, useUpdatePromotion } from '../../hooks/usePromotionMutations';
import {
  promotionFormSchema,
  type PromotionFormInput,
  type PromotionFormValues,
} from '../../schemas';

function toDatetimeLocalString(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoUtcString(localDateTimeString: string): string {
  const d = new Date(localDateTimeString);
  if (Number.isNaN(d.getTime())) return localDateTimeString;
  return d.toISOString();
}

function defaultStartsAt(): string {
  const now = new Date();
  return toDatetimeLocalString(now.toISOString());
}

function defaultEndsAt(): string {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  return toDatetimeLocalString(future.toISOString());
}

export interface PromotionFormDialogProps {
  promotionId?: string | null;
  promotion?: PromotionDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (promotion: PromotionDto) => void;
}

export function PromotionFormDialog({
  promotionId,
  promotion,
  open,
  onOpenChange,
  onSuccess,
}: PromotionFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const detailQuery = usePromotion(promotionId ?? '', Boolean(promotionId) && open);
  const currentPromotion = promotion ?? (promotionId ? detailQuery.data : null);
  const isEditing = Boolean(currentPromotion || promotionId);
  const hasUsage = Boolean(currentPromotion && currentPromotion.usedCount > 0);

  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<PromotionFormInput, unknown, PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 0,
      maxDiscountAmount: null,
      startsAt: defaultStartsAt(),
      endsAt: defaultEndsAt(),
      perCustomerLimit: null,
      usageLimit: null,
    },
  });

  const watchedDiscountType = watch('discountType');
  const watchedDiscountValue = watch('discountValue');
  const watchedMinOrderAmount = watch('minOrderAmount');

  const prevPromotionIdRef = useRef<string | null | undefined>(undefined);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    const promotionLoaded =
      open && currentPromotion && prevPromotionIdRef.current !== currentPromotion.id;

    if (justOpened || promotionLoaded) {
      setFormError(null);
      if (currentPromotion) {
        reset({
          code: currentPromotion.code,
          description: currentPromotion.description ?? '',
          discountType: currentPromotion.discountType,
          discountValue: currentPromotion.discountValue,
          minOrderAmount: currentPromotion.minOrderAmount,
          maxDiscountAmount: currentPromotion.maxDiscountAmount ?? null,
          startsAt: toDatetimeLocalString(currentPromotion.startsAtUtc),
          endsAt: toDatetimeLocalString(currentPromotion.endsAtUtc),
          perCustomerLimit: currentPromotion.perCustomerLimit ?? null,
          usageLimit: currentPromotion.usageLimit ?? null,
        });
      } else if (!promotionId) {
        reset({
          code: '',
          description: '',
          discountType: 'percentage',
          discountValue: 10,
          minOrderAmount: 0,
          maxDiscountAmount: null,
          startsAt: defaultStartsAt(),
          endsAt: defaultEndsAt(),
          perCustomerLimit: null,
          usageLimit: null,
        });
      }

      // Auto-focus code input on open
      setTimeout(() => {
        if (!hasUsage) {
          codeInputRef.current?.focus();
        }
      }, 60);
    }

    wasOpenRef.current = open;
    prevPromotionIdRef.current = currentPromotion?.id;
  }, [open, currentPromotion, promotionId, reset, hasUsage]);

  const onSubmit = async (values: PromotionFormValues) => {
    setFormError(null);

    // Client-side rule check for BR-PRM-06: usageLimit >= usedCount
    if (
      currentPromotion &&
      currentPromotion.usedCount > 0 &&
      values.usageLimit != null &&
      values.usageLimit < currentPromotion.usedCount
    ) {
      setError('usageLimit', {
        message: `Tổng số lượt không được nhỏ hơn số lượt đã dùng (${currentPromotion.usedCount}).`,
      });
      return;
    }

    const body: SavePromotionRequest = {
      code: hasUsage && currentPromotion ? currentPromotion.code : values.code,
      description: values.description?.trim() || null,
      discountType: hasUsage && currentPromotion ? currentPromotion.discountType : values.discountType,
      discountValue:
        hasUsage && currentPromotion ? currentPromotion.discountValue : Number(values.discountValue),
      minOrderAmount: Number(values.minOrderAmount),
      maxDiscountAmount:
        values.discountType === 'percentage' &&
        values.maxDiscountAmount != null &&
        values.maxDiscountAmount > 0
          ? Number(values.maxDiscountAmount)
          : null,
      startsAtUtc: toIsoUtcString(values.startsAt),
      endsAtUtc: toIsoUtcString(values.endsAt),
      perCustomerLimit:
        values.perCustomerLimit != null && values.perCustomerLimit > 0
          ? Number(values.perCustomerLimit)
          : null,
      usageLimit:
        values.usageLimit != null && values.usageLimit > 0
          ? Number(values.usageLimit)
          : null,
    };

    try {
      if (currentPromotion) {
        const updated = await updateMutation.mutateAsync({
          id: currentPromotion.id,
          body,
        });
        toast.success(`Cập nhật khuyến mãi "${updated.code}" thành công.`);
        onSuccess?.(updated);
        onOpenChange(false);
      } else {
        const created = await createMutation.mutateAsync(body);
        toast.success(`Tạo khuyến mãi "${created.code}" thành công.`);
        onSuccess?.(created);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const hasCodeExists = err.errors.some(
          (e) => e.code === promotionErrorCodes.promotionCodeExists,
        );
        const hasUsageLimitBelowUsed = err.errors.some(
          (e) => e.code === promotionErrorCodes.usageLimitBelowUsed,
        );
        const hasPromotionInUse = err.errors.some(
          (e) => e.code === promotionErrorCodes.promotionInUse,
        );
        const hasNotFound =
          err.status === 404 ||
          err.errors.some((e) => e.code === promotionErrorCodes.promotionNotFound);

        if (hasCodeExists) {
          setError('code', { message: 'Mã khuyến mãi này đã tồn tại trong hệ thống.' });
        }
        if (hasUsageLimitBelowUsed) {
          setError('usageLimit', {
            message: `Tổng số lượt không được nhỏ hơn số lượt đã dùng (${currentPromotion?.usedCount ?? 0}).`,
          });
        }
        if (hasPromotionInUse) {
          toast.error('Chương trình đã có lượt dùng, không thể đổi mã, hình thức hay giá trị giảm.');
        }
        if (hasNotFound) {
          toast.error('Không tìm thấy chương trình khuyến mãi hoặc đã bị xóa.');
          onOpenChange(false);
          return;
        }

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

  const { ref: codeRegisterRef, ...codeRegisterProps } = register('code');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            <span>{isEditing ? 'Sửa thông tin khuyến mãi' : 'Tạo khuyến mãi mới'}</span>
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Cập nhật thông tin chi tiết, thời gian và điều kiện áp dụng mã khuyến mãi.'
              : 'Thiết lập mã giảm giá, mức giảm, thời gian hiệu lực và các điều kiện đi kèm.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* BR-PRM-06 warning when promotion has been used */}
        {hasUsage && currentPromotion && (
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs">
              Chương trình đã có <strong>{currentPromotion.usedCount} lượt dùng</strong>. Theo quy
              định (BR-PRM-06), không thể thay đổi mã, hình thức giảm hoặc giá trị giảm.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Row 1: Code and Discount Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="promotion-code">
                Mã khuyến mãi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="promotion-code"
                ref={(e) => {
                  codeRegisterRef(e);
                  codeInputRef.current = e;
                }}
                {...codeRegisterProps}
                disabled={hasUsage || isPending}
                placeholder="VD: SPAVIP20"
                className="font-mono uppercase tracking-wider"
                onChange={(e) => {
                  setValue('code', e.target.value.toUpperCase(), { shouldValidate: true });
                }}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promotion-discount-type">
                Hình thức giảm <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchedDiscountType}
                onValueChange={(val: 'percentage' | 'fixed_amount') => {
                  setValue('discountType', val, { shouldValidate: true });
                  if (val === 'fixed_amount') {
                    setValue('maxDiscountAmount', null, { shouldValidate: true });
                  }
                }}
                disabled={hasUsage || isPending}
              >
                <SelectTrigger id="promotion-discount-type">
                  <SelectValue placeholder="Chọn hình thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Theo phần trăm (%)</SelectItem>
                  <SelectItem value="fixed_amount">Số tiền cố định (VNĐ)</SelectItem>
                </SelectContent>
              </Select>
              {errors.discountType && (
                <p className="text-xs text-destructive">{errors.discountType.message}</p>
              )}
            </div>
          </div>

          {/* Row 2: Discount Value and Max Discount Amount */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="promotion-discount-value">
                {watchedDiscountType === 'percentage'
                  ? 'Phần trăm giảm (%)'
                  : 'Số tiền giảm (VNĐ)'}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="promotion-discount-value"
                type="number"
                step={watchedDiscountType === 'percentage' ? '0.01' : '1000'}
                min={watchedDiscountType === 'percentage' ? '0.01' : '0'}
                max={watchedDiscountType === 'percentage' ? '100' : '999999999'}
                disabled={hasUsage || isPending}
                placeholder={watchedDiscountType === 'percentage' ? 'VD: 15' : 'VD: 50000'}
                {...register('discountValue')}
              />
              {watchedDiscountType === 'fixed_amount' &&
                watchedDiscountValue != null &&
                !Number.isNaN(Number(watchedDiscountValue)) &&
                Number(watchedDiscountValue) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tương đương: {formatCurrency(Number(watchedDiscountValue))}
                  </p>
                )}
              {errors.discountValue && (
                <p className="text-xs text-destructive">{errors.discountValue.message}</p>
              )}
            </div>

            {watchedDiscountType === 'percentage' ? (
              <div className="space-y-1.5">
                <Label htmlFor="promotion-max-discount">
                  Mức giảm tối đa (VNĐ){' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (tùy chọn)
                  </span>
                </Label>
                <Input
                  id="promotion-max-discount"
                  type="number"
                  step="1000"
                  min="0"
                  disabled={isPending}
                  placeholder="Để trống là không giới hạn"
                  {...register('maxDiscountAmount')}
                />
                {errors.maxDiscountAmount && (
                  <p className="text-xs text-destructive">
                    {errors.maxDiscountAmount.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-center rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <InfoIcon className="size-3.5 text-primary" />
                  <span>Giảm giá cố định</span>
                </div>
                <p className="mt-1">
                  Số tiền này sẽ được trừ thẳng vào đơn hàng thỏa điều kiện tối thiểu.
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="promotion-description">
              Mô tả chương trình{' '}
              <span className="text-xs font-normal text-muted-foreground">(tùy chọn)</span>
            </Label>
            <Textarea
              id="promotion-description"
              rows={2}
              maxLength={1000}
              placeholder="VD: Áp dụng cho các khách hàng đặt lịch trải nghiệm dịch vụ chăm sóc da vào cuối tuần..."
              disabled={isPending}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Row 3: Minimum Order Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="promotion-min-order">
              Giá trị đơn hàng tối thiểu (VNĐ) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="promotion-min-order"
              type="number"
              step="1000"
              min="0"
              disabled={isPending}
              placeholder="VD: 200000 (nhập 0 nếu không yêu cầu)"
              {...register('minOrderAmount')}
            />
            {watchedMinOrderAmount != null &&
              !Number.isNaN(Number(watchedMinOrderAmount)) &&
              Number(watchedMinOrderAmount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Áp dụng cho đơn từ: {formatCurrency(Number(watchedMinOrderAmount))}
                </p>
              )}
            {errors.minOrderAmount && (
              <p className="text-xs text-destructive">{errors.minOrderAmount.message}</p>
            )}
          </div>

          {/* Row 4: Starts At and Ends At */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="promotion-starts-at">
                Thời điểm bắt đầu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="promotion-starts-at"
                type="datetime-local"
                disabled={isPending}
                {...register('startsAt')}
              />
              {errors.startsAt && (
                <p className="text-xs text-destructive">{errors.startsAt.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promotion-ends-at">
                Thời điểm kết thúc <span className="text-destructive">*</span>
              </Label>
              <Input
                id="promotion-ends-at"
                type="datetime-local"
                disabled={isPending}
                {...register('endsAt')}
              />
              {errors.endsAt && (
                <p className="text-xs text-destructive">{errors.endsAt.message}</p>
              )}
            </div>
          </div>

          {/* Row 5: Usage Limit and Per Customer Limit */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="promotion-usage-limit">
                Tổng lượt áp dụng tối đa{' '}
                <span className="text-xs font-normal text-muted-foreground">(tùy chọn)</span>
              </Label>
              <Input
                id="promotion-usage-limit"
                type="number"
                min={hasUsage && currentPromotion ? currentPromotion.usedCount : 1}
                max="1000000"
                disabled={isPending}
                placeholder="Để trống là không giới hạn"
                {...register('usageLimit')}
              />
              {hasUsage && currentPromotion && (
                <p className="text-xs text-muted-foreground">
                  Hiện đã dùng {currentPromotion.usedCount} lượt (không thể đặt nhỏ hơn con số này).
                </p>
              )}
              {errors.usageLimit && (
                <p className="text-xs text-destructive">{errors.usageLimit.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promotion-per-customer">
                Giới hạn mỗi khách hàng{' '}
                <span className="text-xs font-normal text-muted-foreground">(tùy chọn)</span>
              </Label>
              <Input
                id="promotion-per-customer"
                type="number"
                min="1"
                max="1000"
                disabled={isPending}
                placeholder="VD: 1 (để trống là không giới hạn)"
                {...register('perCustomerLimit')}
              />
              {errors.perCustomerLimit && (
                <p className="text-xs text-destructive">{errors.perCustomerLimit.message}</p>
              )}
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
                  : 'Tạo khuyến mãi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
