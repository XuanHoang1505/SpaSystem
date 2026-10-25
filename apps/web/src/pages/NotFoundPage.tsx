import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return (
    <section className="page empty-state">
      <p className="eyebrow">404</p>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn này chưa tồn tại.</p>
      <Link className="link-button" to="/">
        Về trang chủ
      </Link>
    </section>
  );
}
