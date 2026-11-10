import { useEffect, useState } from 'react';
import type { StaffDetail, StaffListItem } from '@spa/shared-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { toast } from 'sonner';
import { useServiceSearch } from '@/features/services/hooks/useServiceSearch';
import { useUpdateStaffServices } from '../hooks/useStaffMutations';

export interface UpdateStaffServicesDialogProps {
  staff: StaffListItem | StaffDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UpdateStaffServicesDialog({
  staff,
  open,
  onOpenChange,
  onSuccess,
}: UpdateStaffServicesDialogProps) {
  const updateMutation = useUpdateStaffServices();
  const servicesQuery = useServiceSearch({ pageSize: 100 });
  const services = (servicesQuery.data?.items ?? []).filter((s) => s.status === 'on_sale');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staff && open) {
      setSelectedIds(staff.services.map((s) => s.id));
      setError(null);
    }
  }, [staff, open]);

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(services.map((s) => s.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setError(null);

    try {
      await updateMutation.mutateAsync({
        id: staff.id,
        body: { spaServiceIds: selectedIds },
      });

      toast.success(`Đã cập nhật danh sách dịch vụ phụ trách của ${staff.fullName}.`);

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi khi cập nhật danh sách dịch vụ.',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col">
        <DialogHeader>
          <DialogTitle>Gán dịch vụ phụ trách</DialogTitle>
          <DialogDescription>
            Chọn các dịch vụ mà nhân viên{' '}
            <span className="font-semibold text-foreground">{staff?.fullName}</span> có chuyên môn
            thực hiện.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-muted-foreground">
            Đã chọn <strong className="text-foreground">{selectedIds.length}</strong> /{' '}
            {services.length} dịch vụ
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleSelectAll}
              className="h-auto p-0 text-xs"
            >
              Chọn tất cả
            </Button>
            <span className="text-muted-foreground">•</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleClearAll}
              className="h-auto p-0 text-xs text-muted-foreground"
            >
              Bỏ chọn
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-2 divide-y overflow-y-auto rounded-xl border bg-card/40 p-3">
          {servicesQuery.isLoading && (
            <p className="py-4 text-center text-xs text-muted-foreground italic">
              Đang tải danh sách dịch vụ...
            </p>
          )}

          {!servicesQuery.isLoading && services.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground italic">
              Không có dịch vụ nào đang mở bán.
            </p>
          )}

          {services.map((svc) => (
            <label
              key={svc.id}
              className="flex cursor-pointer items-center gap-3 pt-2.5 text-sm first:pt-0"
            >
              <Checkbox
                checked={selectedIds.includes(svc.id)}
                onCheckedChange={(checked) => handleToggle(svc.id, Boolean(checked))}
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">{svc.name}</span>
                {svc.shortDescription && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {svc.shortDescription}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu dịch vụ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
