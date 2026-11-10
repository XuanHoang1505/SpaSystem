import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUploadAvatar, useDeleteAvatar } from '../hooks/useAvatar';
import { ApiClientError } from '@spa/api-client';

interface AvatarUploaderProps {
  avatarUrl: string | null;
  fullName: string;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AvatarUploader({ avatarUrl, fullName }: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const uploadMutation = useUploadAvatar();
  const deleteMutation = useDeleteAvatar();

  const isBusy = uploadMutation.isPending || deleteMutation.isPending;

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'U';

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting the same file triggers onChange
    event.target.value = '';

    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      toast.error('Ảnh phải có định dạng PNG, JPG, WEBP và dung lượng không quá 5MB.');
      return;
    }

    try {
      await uploadMutation.mutateAsync(file);
      toast.success('Tải ảnh đại diện thành công.');
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 503) {
        toast.error('Dịch vụ lưu trữ ảnh tạm thời không khả dụng, vui lòng thử lại sau.');
      } else {
        toast.error('Không thể tải ảnh đại diện lên, vui lòng thử lại sau.');
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      setDeleteOpen(false);
      toast.success('Đã xóa ảnh đại diện.');
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 503) {
        toast.error('Dịch vụ lưu trữ ảnh tạm thời không khả dụng, vui lòng thử lại sau.');
      } else {
        toast.error('Không thể xóa ảnh đại diện, vui lòng thử lại sau.');
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative group">
        <Avatar className="h-24 w-24 ring-2 ring-border shadow-sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        {isBusy && (
          <div className="absolute inset-0 bg-background/60 rounded-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center sm:items-start gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isBusy}
          aria-label="Chọn tập tin ảnh đại diện"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            aria-label="Tải ảnh đại diện mới"
            className="gap-2"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            Đổi ảnh
          </Button>

          {avatarUrl && (
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  aria-label="Xóa ảnh đại diện"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Xóa ảnh
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xóa ảnh đại diện?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ảnh đại diện của bạn sẽ bị gỡ bỏ và quay về chữ cái đại diện mặc định.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isBusy}>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    disabled={isBusy}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Xác nhận xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Định dạng PNG, JPG, WEBP. Tối đa 5MB.
        </p>
      </div>
    </div>
  );
}
