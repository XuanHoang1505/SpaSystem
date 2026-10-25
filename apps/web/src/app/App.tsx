import { RouterProvider } from 'react-router-dom';
import { createAppRouter } from './router';
import { AppProviders } from './providers';
const router = createAppRouter();
export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
