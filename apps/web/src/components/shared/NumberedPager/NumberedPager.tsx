import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WINDOW = 5;

/** Phân trang có số trang: "Trang trước" · 1 2 3 · "Trang sau" (tối đa 5 số quanh trang hiện tại). */
export function NumberedPager({
  pageNumber,
  totalPages,
  onPageChange,
}: {
  pageNumber: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = Math.max(1, Math.min(pageNumber - 2, totalPages - WINDOW + 1));
  const pages = Array.from({ length: Math.min(WINDOW, totalPages) }, (_, index) => start + index);
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        className="bg-card"
        disabled={pageNumber <= 1}
        onClick={() => onPageChange(pageNumber - 1)}
      >
        <ChevronLeftIcon aria-hidden="true" />
        <span className="hidden sm:inline">Trang trước</span>
      </Button>
      <ul className="flex items-center gap-1.5">
        {pages.map((page) => (
          <li key={page}>
            <Button
              variant={page === pageNumber ? 'default' : 'outline'}
              size="icon"
              className={page === pageNumber ? undefined : 'bg-card'}
              aria-label={`Trang ${page}`}
              aria-current={page === pageNumber ? 'page' : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        className="bg-card"
        disabled={pageNumber >= totalPages}
        onClick={() => onPageChange(pageNumber + 1)}
      >
        <span className="hidden sm:inline">Trang sau</span>
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </nav>
  );
}
