import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ForbiddenPage() {
  return (
    <section className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm font-semibold tracking-[0.3em] text-primary">403</p>
      <h1 className="text-4xl">Không có quyền truy cập</h1>
      <p className="text-muted-foreground">Xác thực và phân quyền đang được phát triển.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/">Về trang chủ</Link>
      </Button>
    </section>
  );
}
