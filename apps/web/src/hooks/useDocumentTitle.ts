import { useEffect } from 'react';

const SITE = 'Như Nguyệt Spa';

/** Đặt tiêu đề tab "{title} · Như Nguyệt Spa" khi trang đang mở; bỏ qua khi chưa có tiêu đề (đang tải). */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${SITE}`;
    // Trang khác chưa đặt tiêu đề riêng: trả lại tiêu đề cũ khi rời trang.
    return () => {
      document.title = previous;
    };
  }, [title]);
}
