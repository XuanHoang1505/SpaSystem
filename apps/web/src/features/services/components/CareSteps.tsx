import { CheckCircle2Icon, ClockIcon } from 'lucide-react';
import type { ServiceStep } from '@spa/shared-types';
import { placeholderServiceBenefits } from '../catalogPlaceholders';

/**
 * "Quy trình chăm sóc" từ `steps` của dịch vụ (Q-71; ẩn khi chưa có bước) và "Bạn sẽ nhận được" (vẫn là nội dung tạm).
 */
export function CareSteps({ steps }: { steps: readonly ServiceStep[] }) {
  return (
    <section
      aria-labelledby="care-steps"
      className="-mx-4 space-y-8 border-y bg-muted/60 px-4 py-10 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          Trải nghiệm tại spa
        </p>
        <h2 id="care-steps" className="mt-2 text-2xl sm:text-3xl">
          {steps.length > 0 ? 'Quy trình chăm sóc' : 'Bạn sẽ nhận được'}
        </h2>
      </div>
      {steps.length > 0 && (
        <ol aria-label="Quy trình chăm sóc" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.sortOrder} className="space-y-2 rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="grid size-9 place-items-center rounded-md border bg-accent font-heading text-lg text-accent-foreground">
                  {String(step.sortOrder).padStart(2, '0')}
                </span>
                {step.durationMinutes !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <ClockIcon className="size-3" aria-hidden="true" />
                    {`${step.durationMinutes} phút`}
                  </span>
                )}
              </div>
              <h3 className="text-lg">{step.title}</h3>
              {step.description && (
                <p className="text-sm text-muted-foreground">{step.description}</p>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="mx-auto max-w-3xl rounded-xl border bg-card p-6">
        {steps.length > 0 && <h3 className="mb-4 text-xl">Bạn sẽ nhận được</h3>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {placeholderServiceBenefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm">
              <CheckCircle2Icon
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
