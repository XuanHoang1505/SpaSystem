import { useState } from 'react';
import { AppButton } from '@components/common/AppButton/AppButton';
import { AppModal } from '@components/common/AppModal/AppModal';
import { EmptyState } from '@components/common/EmptyState/EmptyState';
export function PlaceholderPage({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="page">
      <p className="eyebrow">SPA NHƯ NGUYỆT · FOUNDATION</p>
      <h1>{title}</h1>
      <EmptyState
        title="Tính năng đang được phát triển"
        description="Đây là trang placeholder. Chưa có dữ liệu hoặc thao tác nghiệp vụ."
      />
      <AppButton onClick={() => setOpen(true)}>Thông tin phiên bản</AppButton>
      <AppModal open={open} onClose={() => setOpen(false)} title="Phiên bản nền tảng">
        <p>Đang hoàn thiện cấu trúc, giao diện và kết nối hệ thống.</p>
      </AppModal>
    </section>
  );
}
