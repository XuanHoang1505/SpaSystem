import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export function ReviewImageDialog({ imageUrl, onClose }: Props) {
  return (
    <Dialog open={Boolean(imageUrl)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden border-none bg-black/95 p-2 sm:rounded-2xl">
        <DialogTitle className="sr-only">Ảnh chụp thực tế từ khách hàng</DialogTitle>
        {imageUrl && (
          <div className="flex max-h-[80vh] items-center justify-center">
            <img
              src={imageUrl}
              alt="Ảnh đánh giá từ khách hàng"
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
