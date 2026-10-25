import { Outlet } from 'react-router-dom';
import { Header } from './Header/Header';
import { Footer } from './Footer/Footer';
import { Sidebar } from './Sidebar/Sidebar';
import type { Workspace } from '@/config/navigation';
export function WorkspaceLayout({ workspace }: { workspace: Workspace }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      <Header withSidebar />
      <div className="workspace">
        <Sidebar workspace={workspace} />
        <main id="main-content" tabIndex={-1}>
          <div className="preview-banner">
            Bản xem trước giao diện · Chưa triển khai xác thực hoặc dữ liệu nghiệp vụ
          </div>
          <Outlet />
        </main>
      </div>
      <Footer />
    </>
  );
}
