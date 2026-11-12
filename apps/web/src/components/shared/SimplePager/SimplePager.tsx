import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Phân trang gọn "Trang x/y" cho lưới thẻ (bảng dữ liệu dùng phân trang của DataTable). */
export function SimplePager({
  pageNumber,
  totalPages,
  onPageChange,
}: {
  pageNumber: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="icon"
        aria-label="Trang trước"
        disabled={pageNumber <= 1}
        onClick={() => onPageChange(pageNumber - 1)}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Trang {pageNumber}/{totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Trang sau"
        disabled={pageNumber >= totalPages}
        onClick={() => onPageChange(pageNumber + 1)}
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </nav>
  );
}
