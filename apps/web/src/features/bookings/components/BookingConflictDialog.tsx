import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** The chosen hour was taken meanwhile (or the customer has another appointment then). */
export function BookingConflictDialog({ open, onChoose }: { open: boolean; onChoose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onChoose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Giờ vừa hết chỗ</DialogTitle>
          <DialogDescription>
            Giờ bạn chọn vừa có người đặt hoặc bạn đã có lịch khác lúc này.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onChoose}>Chọn giờ khác</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
