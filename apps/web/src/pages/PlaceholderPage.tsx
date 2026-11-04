import { HammerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <PageHeader
        eyebrow="Spa Như Nguyệt · Foundation"
        title={title}
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
      <Card>
        <CardContent>
          <EmptyState
            icon={HammerIcon}
            title="Tính năng đang được phát triển"
            description="Đây là trang placeholder. Chưa có dữ liệu hoặc thao tác nghiệp vụ."
          />
        </CardContent>
      </Card>
    </section>
  );
}
