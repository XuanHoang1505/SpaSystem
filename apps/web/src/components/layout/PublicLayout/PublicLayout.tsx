import { Outlet } from 'react-router-dom';
import { useThemeScope } from '@/stores/themeScopeStore';
import { Header } from '../Header/Header';
import { Footer } from '../Footer/Footer';
import { SkipLink } from '../SkipLink/SkipLink';

export function PublicLayout() {
  useThemeScope('light-only');
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
