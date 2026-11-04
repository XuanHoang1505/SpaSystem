import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm font-semibold tracking-[0.3em] text-primary">404</p>
      <h1 className="text-4xl">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">Đường dẫn này chưa tồn tại.</p>
      <Button asChild className="mt-4">
        <Link to="/">Về trang chủ</Link>
      </Button>
    </section>
  );
}
