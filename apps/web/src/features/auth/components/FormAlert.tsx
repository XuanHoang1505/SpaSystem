import type { ReactNode } from 'react';
import { CircleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FormAlert({ message, action }: { message?: string | null; action?: ReactNode }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlertIcon aria-hidden="true" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{message}</span>
        {action}
      </AlertDescription>
    </Alert>
  );
}
