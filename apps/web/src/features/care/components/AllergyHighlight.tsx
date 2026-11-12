import { useId } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import type { CustomerAllergy } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { allergySeverityBadge } from '@/features/bookings/appointmentStatus';

/** The customer's allergies above every tab (BR-CARE-02 order as sent); destructive once one is severe. */
export function AllergyHighlight({ allergies }: { allergies: readonly CustomerAllergy[] }) {
  const titleId = useId();
  if (allergies.length === 0) return null;
  const severe = allergies.some((allergy) => allergy.severity === 'severe');

  return (
    <Alert
      variant={severe ? 'destructive' : 'default'}
      aria-labelledby={titleId}
      data-severity={severe ? 'severe' : 'normal'}
      className={severe ? undefined : 'border-status-warning bg-status-warning/10'}
    >
      <AlertCircleIcon
        className={severe ? 'size-4' : 'size-4 text-status-warning'}
        aria-hidden="true"
      />
      <AlertTitle id={titleId} className="font-semibold">
        {`Khách có ${allergies.length} dị ứng cần lưu ý`}
      </AlertTitle>
      <AlertDescription className="mt-1 space-y-1.5 text-foreground">
        {allergies.map((allergy) => {
          const badge = allergySeverityBadge(allergy.severity);
          return (
            <div key={allergy.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{allergy.allergen}</span>
              <StatusBadge label={badge.label} tone={badge.tone} />
              {allergy.note && <span className="text-muted-foreground">{allergy.note}</span>}
            </div>
          );
        })}
      </AlertDescription>
    </Alert>
  );
}
