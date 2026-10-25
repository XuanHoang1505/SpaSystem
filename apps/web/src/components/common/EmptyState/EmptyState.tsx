export function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Nội dung sẽ xuất hiện khi tính năng được triển khai.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="empty-state">
      <span aria-hidden="true">✧</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
