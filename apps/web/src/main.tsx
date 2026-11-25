import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import { devCanonicalUrl } from './config/devOrigin';
import './styles/index.css';

const devTarget = devCanonicalUrl(
  window.location,
  import.meta.env.VITE_DEV_CANONICAL_ORIGIN,
  import.meta.env.DEV,
);
if (devTarget) {
  window.location.replace(devTarget);
} else {
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element is missing.');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
