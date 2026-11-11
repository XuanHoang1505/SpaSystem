import { useEffect, useRef, useState } from 'react';
import { ImagePlusIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { ApiClientError, catalogErrorCodes, errorCodeOf } from '@spa/api-client';
import type { PackageDetail, PackageListItem } from '@spa/shared-types';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { allowedImageMimeTypes, catalogPolicies } from '@/features/services';
import { useDeletePackageImage, useUploadPackageImage } from '../../hooks/usePackageMutations';

export interface PackageImageDialogProps {
  pkg: PackageListItem | PackageDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PackageImageDialog({
  pkg,
  open,
  onOpenChange,
  onSuccess,
}: PackageImageDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadMutation = useUploadPackageImage();
  const deleteMutation = useDeletePackageImage();
  const isPending = uploadMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (!open) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMessage(null);
    }
  }, [open, previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!allowedImageMimeTypes.includes(file.type as (typeof allowedImageMimeTypes)[number])) {
      setErrorMessage('Định dạng ảnh không được hỗ trợ. Vui lòng chọn file JPEG, PNG hoặc WebP.');
      return;
    }

    if (file.size > catalogPolicies.maxImageSizeBytes) {
      setErrorMessage('Dung lượng ảnh vượt quá giới hạn tối đa 5 MB.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!pkg || !selectedFile) return;
    setErrorMessage(null);

    try {
      await uploadMutation.mutateAsync({
        id: pkg.id,
        file: selectedFile,
      });

      toast.success(`Cập nhật ảnh đại diện cho gói "${pkg.name}" thành công.`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === catalogErrorCodes.requestTooLarge) {
        setErrorMessage('Dung lượng ảnh vượt quá giới hạn 5 MB.');
      } else if (code === catalogErrorCodes.imageStorageUnavailable) {
        setErrorMessage('Dịch vụ lưu trữ ảnh tạm thời không khả dụng. Vui lòng thử lại sau.');
      } else if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi tải ảnh lên. Vui lòng thử lại.');
      }
    }
  };

  const handleDelete = async () => {
    if (!pkg) return;
    setErrorMessage(null);

    try {
      await deleteMutation.mutateAsync(pkg.id);
      toast.success(`Đã xóa ảnh riêng của gói "${pkg.name}".`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi xóa ảnh. Vui lòng thử lại.');
      }
    }
  };

  const currentDisplayUrl = previewUrl || pkg?.imageUrl || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quản lý ảnh đại diện gói</DialogTitle>
          <DialogDescription>
            Tải lên ảnh riêng hoặc xóa ảnh đại diện của gói{' '}
            <strong className="text-foreground">{pkg?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
            {currentDisplayUrl ? (
              <img
                src={currentDisplayUrl}
                alt={pkg?.name || 'Ảnh gói dịch vụ'}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlusIcon className="size-10 stroke-1" />
                <span className="text-xs">Chưa có ảnh riêng</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
            <strong className="font-semibold text-foreground">Ghi chú hiển thị: </strong>
            Nếu không tải ảnh riêng, gói sẽ tự động hiển thị ảnh của dịch vụ thành phần đầu tiên.
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Định dạng hỗ trợ: JPEG, PNG, WebP. Tối đa 5 MB.
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="gap-1.5"
              >
                <UploadIcon className="size-3.5" />
                {selectedFile ? 'Chọn ảnh khác' : 'Chọn tệp ảnh'}
              </Button>
              {selectedFile && (
                <span className="truncate text-xs font-medium text-foreground">
                  {selectedFile.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row flex-wrap justify-between gap-2 pt-3 sm:justify-between">
          <div>
            {pkg?.imageUrl && !selectedFile && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="gap-1.5"
              >
                <Trash2Icon className="size-3.5" />
                Xóa ảnh riêng
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleUpload}
              disabled={!selectedFile || isPending}
            >
              {uploadMutation.isPending ? 'Đang tải lên...' : 'Lưu ảnh'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
