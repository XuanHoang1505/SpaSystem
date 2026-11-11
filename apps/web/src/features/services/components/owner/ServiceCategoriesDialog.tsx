import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangleIcon, CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { ApiClientError, catalogErrorCodes, errorCodeOf } from '@spa/api-client';
import type {
  CreateServiceCategoryRequest,
  ServiceCategory,
  UpdateServiceCategoryRequest,
} from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useServiceCategories } from '../../hooks/useServiceCategories';
import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../../hooks/useServiceMutations';
import {
  serviceCategoryFormSchema,
  type ServiceCategoryFormInput,
  type ServiceCategoryFormValues,
} from '../../schemas';

export interface ServiceCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceCategoriesDialog({
  open,
  onOpenChange,
}: ServiceCategoriesDialogProps) {
  const categoriesQuery = useServiceCategories();
  const categories = categoriesQuery.data ?? [];

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [formMode, setFormMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ServiceCategory | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<ServiceCategoryFormInput, unknown, ServiceCategoryFormValues>({
    resolver: zodResolver(serviceCategoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      sortOrder: 0,
      isActive: true,
    },
  });

  const watchedIsActive = Boolean(watch('isActive'));

  const startCreate = () => {
    setFormError(null);
    setEditingCategory(null);
    reset({
      name: '',
      description: '',
      sortOrder: categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 0,
      isActive: true,
    });
    setFormMode('create');
    setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setFocus('name');
    }, 50);
  };

  const startEdit = (category: ServiceCategory) => {
    setFormError(null);
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description ?? '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setFormMode('edit');
    setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setFocus('name');
    }, 50);
  };

  const cancelForm = () => {
    setFormMode('idle');
    setEditingCategory(null);
    setFormError(null);
  };

  const onSubmit = async (values: ServiceCategoryFormValues) => {
    setFormError(null);

    try {
      if (formMode === 'edit' && editingCategory) {
        const body: UpdateServiceCategoryRequest = {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          sortOrder: Number(values.sortOrder),
          isActive: Boolean(values.isActive),
        };
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          body,
        });
        toast.success(`Cập nhật danh mục "${values.name}" thành công.`);
        cancelForm();
      } else {
        const body: CreateServiceCategoryRequest = {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          sortOrder: Number(values.sortOrder),
          isActive: Boolean(values.isActive),
        };
        await createMutation.mutateAsync(body);
        toast.success(`Tạo danh mục "${values.name}" thành công.`);
        cancelForm();
      }
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === catalogErrorCodes.serviceCategoryExists) {
        setFormError('Tên danh mục này đã tồn tại. Vui lòng chọn tên khác.');
      } else if (err instanceof ApiClientError) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi lưu danh mục.');
      }
    }
  };

  const handleDelete = async (category: ServiceCategory) => {
    if (category.serviceCount > 0) {
      setDeleteError(
        `Không thể xóa danh mục "${category.name}" vì đang có ${category.serviceCount} dịch vụ liên kết (theo BR-CAT-13).`,
      );
      return;
    }

    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(category.id);
      toast.success(`Đã xóa danh mục "${category.name}".`);
      setDeletingCategory(null);
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === catalogErrorCodes.serviceCategoryInUse) {
        setDeleteError('Không thể xóa danh mục đang có dịch vụ liên kết.');
      } else if (err instanceof ApiClientError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Đã có lỗi xảy ra khi xóa danh mục.');
      }
    }
  };

  const isFormPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          cancelForm();
          setDeletingCategory(null);
          setDeleteError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent ref={scrollContainerRef} className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-5">
            <div>
              <DialogTitle>Danh mục dịch vụ</DialogTitle>
            </div>
            {formMode === 'idle' && !deletingCategory && (
              <Button size="sm" onClick={startCreate} className="gap-1.5 text-xs">
                <PlusIcon className="size-3.5" />
                Thêm danh mục
              </Button>
            )}
          </div>
        </DialogHeader>

        {deleteError && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="size-4" />
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        {/* Delete Confirmation Card */}
        {deletingCategory && (
          <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="flex items-start gap-2.5 text-destructive">
              <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
              <div>
                <h4 className="font-semibold">Xác nhận xóa danh mục</h4>
                <p className="text-xs text-muted-foreground">
                  Bạn có chắc chắn muốn xóa danh mục{' '}
                  <strong className="text-foreground">{deletingCategory.name}</strong>? Thao tác này
                  không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeletingCategory(null);
                  setDeleteError(null);
                }}
                disabled={deleteMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(deletingCategory)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
              </Button>
            </div>
          </div>
        )}

        {/* Inline Add/Edit Form */}
        {formMode !== 'idle' && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 rounded-xl border bg-card/60 p-4"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-foreground">
                {formMode === 'edit' ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelForm}
                className="size-7 p-0"
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="cat-name" className="text-xs">
                  Tên danh mục <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cat-name"
                  placeholder="Ví dụ: Chăm sóc da mặt"
                  className="h-9 text-sm"
                  {...register('name')}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="cat-sortOrder" className="text-xs">
                  Thứ tự hiển thị
                </Label>
                <Input
                  id="cat-sortOrder"
                  type="number"
                  min={0}
                  className="h-9 text-sm"
                  {...register('sortOrder')}
                />
                {errors.sortOrder && (
                  <p className="text-xs text-destructive">{errors.sortOrder.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cat-description" className="text-xs">
                Mô tả danh mục
              </Label>
              <Input
                id="cat-description"
                placeholder="Mô tả nhóm dịch vụ (tùy chọn)..."
                className="h-9 text-sm"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="cat-isActive"
                checked={watchedIsActive}
                onCheckedChange={(checked) => setValue('isActive', Boolean(checked))}
              />
              <Label htmlFor="cat-isActive" className="cursor-pointer text-xs font-medium">
                Đang kích hoạt (hiển thị trên trang dịch vụ khách hàng)
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelForm}
                disabled={isFormPending}
              >
                Hủy
              </Button>
              <Button type="submit" size="sm" disabled={isFormPending} className="gap-1.5">
                <CheckIcon className="size-3.5" />
                {isFormPending ? 'Đang lưu...' : 'Lưu danh mục'}
              </Button>
            </div>
          </form>
        )}

        {/* Categories List */}
        <div className="space-y-2">
          {categoriesQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          )}

          {!categoriesQuery.isLoading && categories.length === 0 && (
            <EmptyState
              title="Chưa có danh mục dịch vụ"
              description="Bấm &quot;Thêm danh mục&quot; ở trên để tạo nhóm danh mục đầu tiên."
            />
          )}

          {!categoriesQuery.isLoading && categories.length > 0 && (
            <div className="divide-y rounded-xl border bg-card/60">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 text-sm sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{cat.name}</span>
                      <StatusBadge
                        label={cat.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                        tone={cat.isActive ? 'success' : 'neutral'}
                        className="text-[11px]"
                      />
                    </div>
                    {cat.description && (
                      <p className="truncate text-xs text-muted-foreground">{cat.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Thứ tự: <strong>{cat.sortOrder}</strong></span>
                      <span>•</span>
                      <span>
                        Dịch vụ liên kết: <strong>{cat.serviceCount}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(cat)}
                      className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <PencilIcon className="size-3.5" />
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cat.serviceCount > 0}
                      title={
                        cat.serviceCount > 0
                          ? 'Không thể xóa danh mục đang có dịch vụ liên kết (theo BR-CAT-13)'
                          : 'Xóa danh mục'
                      }
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingCategory(cat);
                      }}
                      className="h-8 gap-1 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2Icon className="size-3.5" />
                      Xóa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
