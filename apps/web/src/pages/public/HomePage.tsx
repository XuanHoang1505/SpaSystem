import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SystemStatus } from '@/components/shared/SystemStatus/SystemStatus';

const workspaces = [
  ['01', 'Khách hàng', 'Khám phá không gian cá nhân, lịch hẹn và liệu trình.', '/account'],
  ['02', 'Nhân viên', 'Không gian lịch làm việc và buổi chăm sóc.', '/staff'],
  ['03', 'Quản lý', 'Không gian quản lý hoạt động của spa.', '/owner'],
] as const;

export function HomePage() {
  return (
    <div className="space-y-16 pb-8">
      <section className="grid items-center gap-12 pt-6 md:grid-cols-[1.15fr_1fr] md:pt-10">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary">NHƯ NGUYỆT SPA</p>
          <h1 className="my-6 text-4xl tracking-tighter sm:text-6xl">
            Một khoảng lặng,
            <br />
            <em className="font-normal text-primary">dành riêng cho bạn.</em>
          </h1>
          <p className="mb-8 max-w-md text-muted-foreground">
            Không gian chăm sóc da và trải nghiệm thư thái. Nền tảng kết nối khách hàng, nhân viên
            và quản lý.
          </p>
          <Button asChild size="lg">
            <Link to="/services">
              Khám phá dịch vụ <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">
            Phiên bản nền tảng · Tính năng đang được phát triển
          </p>
        </div>
        <div
          className="relative hidden min-h-96 overflow-hidden rounded-t-[200px] rounded-b-2xl bg-accent md:block"
          aria-hidden="true"
        >
          <div className="absolute top-6 right-6 size-32 rounded-full bg-chart-5/50" />
          <div className="absolute inset-x-16 top-16 bottom-0 grid place-items-center rounded-t-[150px] bg-background shadow-[inset_8px_0_30px_var(--border)]">
            <span className="text-center font-heading text-5xl leading-tight tracking-tighter text-primary">
              như
              <br />
              <em>nguyệt</em>
            </span>
          </div>
          <div className="absolute -bottom-8 left-1 h-56 w-28 rotate-[15deg] rounded-[0_100%_0_100%] bg-chart-2/60" />
          <div className="absolute -bottom-14 left-12 h-56 w-28 rotate-[40deg] rounded-[0_100%_0_100%] bg-secondary" />
          <span className="absolute right-5 bottom-5 text-[9px] tracking-[0.15em] text-muted-foreground">
            CHĂM SÓC · CÂN BẰNG · THƯ THÁI
          </span>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary">CÙNG MỘT NỀN TẢNG</p>
            <h2 className="mt-2 text-3xl">Không gian của bạn</h2>
          </div>
          <Badge variant="secondary">Bản xem trước</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {workspaces.map(([number, title, description, path]) => (
            <Link key={number} to={path} className="group rounded-xl">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="flex h-full flex-col gap-2">
                  <span className="font-mono text-xs text-primary">{number}</span>
                  <h3 className="text-2xl">{title}</h3>
                  <p className="flex-1 text-sm text-muted-foreground">{description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Xem giao diện <ArrowUpRightIcon className="size-4" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl">Kết nối hệ thống</h2>
            <p className="text-sm text-muted-foreground">
              Kiểm tra API nền tảng, không sử dụng dữ liệu nghiệp vụ.
            </p>
          </div>
          <SystemStatus />
        </CardContent>
      </Card>
    </div>
  );
}
