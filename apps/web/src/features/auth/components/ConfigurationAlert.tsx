import { TriangleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { readEnvironment } from '@/config/env';

/** True when `VITE_API_BASE_URL` is valid; forms stay disabled otherwise and never call the network. */
export const useApiConfigured = () => !readEnvironment().error;

export function ConfigurationAlert() {
  const { error } = readEnvironment();
  if (!error) return null;
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>Configuration Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
