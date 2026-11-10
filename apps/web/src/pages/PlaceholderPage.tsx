import { HammerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { OrdersBreadcrumb } from '@/features/orders';

export function PlaceholderPage({ title }: { title: string }) {
  const trail =
    title === 'Tài khoản'
      ? [{ label: 'Trang chủ', to: '/' }, { label: 'Tài khoản' }]
      : [{ label: 'Trang chủ', to: '/' }, { label: 'Tài khoản', to: '/account' }, { label: title }];

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={trail} />
      <PageHeader
        title={title}
        className="border-b pb-5"
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Thông tin phiên bản</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Phiên bản nền tảng</DialogTitle>
                <DialogDescription>
                  Đang hoàn thiện cấu trúc, giao diện và kết nối hệ thống.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Đóng</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="py-6">
        <EmptyState
          icon={HammerIcon}
          title="Tính năng đang được phát triển"
          description="Đây là trang placeholder. Chưa có dữ liệu hoặc thao tác nghiệp vụ."
        />
      </div>
    </section>
  );
}
