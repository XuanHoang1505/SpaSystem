import { PublicLayout } from '../PublicLayout/PublicLayout';

/** The customer area wears the same site header and footer as the public pages (light only, no admin sidebar). */
export function CustomerLayout() {
  return <PublicLayout />;
}
