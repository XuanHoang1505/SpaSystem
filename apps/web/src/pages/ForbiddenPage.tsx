import { Link } from 'react-router-dom';
export function ForbiddenPage() {
  return (
    <section className="page">
      <h1>Không có quyền truy cập</h1>
      <p>Xác thực và phân quyền đang được phát triển.</p>
      <Link to="/">Về trang chủ</Link>
    </section>
  );
}
