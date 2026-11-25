import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSettleLogout } from '@/features/auth/hooks/useSettleLogout';
import { useThemeScope } from '@/stores/themeScopeStore';
import { AiChatWidget } from '@/features/ai-assistant';
import { Header } from '../Header/Header';
import { Footer } from '../Footer/Footer';
import { SkipLink } from '../SkipLink/SkipLink';

const fullWidthPaths = new Set(['/', '/about', '/contact']);

export function PublicLayout() {
  useThemeScope('light-only');
  useSettleLogout();
  // The brand pages (home, about, contact) run edge to edge (full-width bands and photos) and set their own content
  // width per section.
  const fullWidth = fullWidthPaths.has(useLocation().pathname);
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'w-full flex-1 outline-none',
          !fullWidth && 'mx-auto max-w-7xl px-4 pt-8 pb-20 sm:px-6 sm:pb-8 lg:px-8',
        )}
      >
        <Outlet />
      </main>
      <Footer />
      <AiChatWidget />
    </div>
  );
}
