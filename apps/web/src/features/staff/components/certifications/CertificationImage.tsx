import { useRef, useState } from 'react';
import { ImageIcon, ImagePlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import type { StaffCertification } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { CertificationActions } from '../../hooks/useStaffCertifications';
import {
  certificationImageAccept,
  certificationImageErrorMessage,
  checkCertificationImage,
} from './certificationImageFile';

/**
 * The photo of one certificate: a thumbnail that opens the full image, plus upload/replace/remove when allowed.
 * A staff member changing it sends the certification back to review (BR-STF-14).
 */
export function CertificationImage({
  certification,
  actions,
  canWrite,
  isOwner,
}: {
  certification: StaffCertification;
  actions: CertificationActions;
  canWrite: boolean;
  isOwner: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { imageUrl, name } = certification;
  const busy = uploading || removing;
  const reviewHint = isOwner ? '' : ' Bằng sẽ chờ chủ spa duyệt lại.';

  if (!imageUrl && !canWrite) return null;

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = checkCertificationImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(true);
    try {
      await actions.uploadImage(certification.id, file);
      toast.success(`Đã cập nhật ảnh bằng.${reviewHint}`);
    } catch (error) {
      toast.error(certificationImageErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await actions.removeImage(certification.id);
      toast.success(`Đã xóa ảnh bằng.${reviewHint}`);
      setConfirmOpen(false);
    } catch (error) {
      toast.error(certificationImageErrorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {imageUrl ? (
        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Xem ảnh bằng ${name}`}
          className="block overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ImageWithFallback
            src={imageUrl}
            alt={`Ảnh bằng ${name}`}
            fallbackIcon={ImageIcon}
            className="h-20 w-28"
          />
        </a>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5" aria-hidden="true" />
          Chưa có ảnh bằng
        </p>
      )}

      {canWrite && (
        <div className="flex flex-wrap gap-1">
          <input
            ref={inputRef}
            type="file"
            accept={certificationImageAccept}
            className="hidden"
            onChange={(event) => void onFile(event)}
            disabled={busy}
            aria-label={`Chọn ảnh bằng ${name}`}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={uploading}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlusIcon aria-hidden="true" />
            {imageUrl ? 'Đổi ảnh' : 'Tải ảnh'}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              aria-label={`Xóa ảnh bằng ${name}`}
              onClick={() => setConfirmOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2Icon aria-hidden="true" />
              Xóa ảnh
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !removing && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Xóa ảnh bằng ${name}?`}</AlertDialogTitle>
            <AlertDialogDescription>{`Ảnh sẽ bị gỡ khỏi hồ sơ.${reviewHint}`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removing}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              Xóa ảnh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
