import { CheckCircle2Icon, ClockIcon, ListChecksIcon, SparklesIcon } from 'lucide-react';
import type { ServiceStep } from '@spa/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { placeholderServiceBenefits } from '../catalogPlaceholders';

/**
 * "Quy trình chăm sóc" từ `steps` của dịch vụ (Q-71) thiết kế dạng Timeline trực quan kèm thanh phân bổ thời lượng,
 * kết hợp cùng khung "Bạn sẽ nhận được" (tiêu chuẩn phục vụ tại spa).
 */
export function CareSteps({
  steps,
  totalMinutes,
}: {
  steps: readonly ServiceStep[];
  totalMinutes?: number;
}) {
  const stepMinutesSum = steps.reduce((sum, step) => sum + (step.durationMinutes ?? 0), 0);
  const displayMinutes = totalMinutes ?? (stepMinutesSum > 0 ? stepMinutesSum : undefined);
  const hasDurations = steps.some((step) => (step.durationMinutes ?? 0) > 0);

  return (
    <Card className="rounded-2xl py-0">
      <CardContent className="space-y-6 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Trải nghiệm tại spa
            </p>
            <h2
              id="care-steps"
              className="font-heading text-xl font-semibold text-foreground sm:text-2xl"
            >
              {steps.length > 0 ? 'Quy trình chăm sóc chi tiết' : 'Tiêu chuẩn phục vụ tại spa'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {steps.length > 0
                ? 'Từng bước được kỹ thuật viên thực hiện tuần tự, nhẹ nhàng và chuẩn thời lượng.'
                : 'Mỗi buổi chăm sóc đều tuân thủ quy trình vệ sinh và phục vụ riêng tư.'}
            </p>
          </div>
          {steps.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <ListChecksIcon className="size-3.5 text-primary" aria-hidden="true" />
              {steps.length} bước
              {displayMinutes ? ` · ${displayMinutes} phút` : ''}
            </span>
          )}
        </div>

        {steps.length > 0 && hasDurations && (
          <div className="space-y-2 rounded-xl border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Phân bổ thời lượng quy trình</span>
              <span>{stepMinutesSum > 0 ? `${stepMinutesSum} phút thực hiện chuyên sâu` : ''}</span>
            </div>
            <div
              className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-muted p-0.5"
              aria-hidden="true"
            >
              {steps.map((step, index) => (
                <div
                  key={step.sortOrder}
                  style={{ flexGrow: Math.max(step.durationMinutes ?? 5, 5) }}
                  className={cn(
                    'h-full rounded-full transition-all',
                    index % 3 === 0
                      ? 'bg-primary'
                      : index % 3 === 1
                        ? 'bg-primary/70'
                        : 'bg-primary/45',
                  )}
                  title={`Bước ${step.sortOrder}: ${step.title}${step.durationMinutes ? ` (${step.durationMinutes} phút)` : ''}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {steps.map((step) => (
                <span key={step.sortOrder} className="inline-flex items-center gap-1">
                  <span className="font-semibold text-primary">
                    B{String(step.sortOrder).padStart(2, '0')}:
                  </span>
                  <span className="truncate">{step.title}</span>
                  {step.durationMinutes !== null && <span>({step.durationMinutes}p)</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {steps.length > 0 && (
          <ol aria-label="Quy trình chăm sóc" className="space-y-0">
            {steps.map((step, index) => {
              const last = index === steps.length - 1;
              return (
                <li key={step.sortOrder} className="relative flex gap-3.5 pb-4 last:pb-0 sm:gap-4">
                  {!last && (
                    <span
                      aria-hidden="true"
                      className="absolute top-11 bottom-0 left-4 w-px bg-border sm:top-12 sm:left-5"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative mt-2.5 grid size-8 shrink-0 place-items-center rounded-full font-heading text-xs font-semibold sm:size-10 sm:text-sm',
                      index === 0
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-primary/10 text-primary ring-1 ring-primary/20',
                    )}
                  >
                    {String(step.sortOrder).padStart(2, '0')}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 rounded-2xl border bg-background/60 p-4 transition-colors hover:bg-background sm:flex-row sm:items-start sm:gap-4">
                    <div className="space-y-1">
                      <h3 className="font-heading text-base font-semibold text-foreground sm:text-lg">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.description ??
                          `Thực hiện ${step.title.toLowerCase()} theo đúng kỹ thuật và định lượng tiêu chuẩn của Như Nguyệt Spa.`}
                      </p>
                    </div>
                    {step.durationMinutes !== null && (
                      <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                        <ClockIcon className="size-3.5 text-primary" aria-hidden="true" />
                        {`${step.durationMinutes} phút`}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="space-y-3 border-t pt-6">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
            <h3 className="font-heading text-base font-semibold text-foreground sm:text-lg">
              Bạn sẽ nhận được
            </h3>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {placeholderServiceBenefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2.5 rounded-xl border bg-muted/30 p-3 text-sm text-foreground"
              >
                <CheckCircle2Icon
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
