import { AppSpinner } from '../AppSpinner/AppSpinner';
export function PageLoader() {
  return (
    <div className="empty-state">
      <AppSpinner />
      <p>Đang tải trang…</p>
    </div>
  );
}
