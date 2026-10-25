import { Outlet } from 'react-router-dom';
import { Header } from '../Header/Header';
import { Footer } from '../Footer/Footer';
import { MobileNavigation } from '../MobileNavigation/MobileNavigation';
export function PublicLayout() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      <Header />
      <MobileNavigation />
      <main id="main-content" className="public-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
