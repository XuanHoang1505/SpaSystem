import {
  ClockIcon,
  CrosshairIcon,
  DropletsIcon,
  FlaskConicalIcon,
  SparklesIcon,
  StickyNoteIcon,
  TargetIcon,
  UserRoundIcon,
  type LucideIcon,
} from 'lucide-react';
import type { SkinProfile } from '@spa/shared-types';
import { formatDateTimeUtc } from '@/lib/formatting/formatters';
import { cn } from '@/lib/utils';
import { skinTypeLabel } from '../careLabels';

/** Read-only skin profile of one visit: the skin type up front, then one card per observation. */
export function SkinProfileView({ profile }: { profile: SkinProfile }) {
  const fields: readonly {
    icon: LucideIcon;
    label: string;
    value: string | null;
    wide?: boolean;
  }[] = [
    { icon: CrosshairIcon, label: 'Vấn đề chính', value: profile.mainConcerns },
    { icon: FlaskConicalIcon, label: 'Sản phẩm đang dùng', value: profile.currentProducts },
    { icon: TargetIcon, label: 'Mục tiêu chăm sóc', value: profile.careGoals },
    { icon: SparklesIcon, label: 'Liệu trình đề xuất', value: profile.recommendedTreatment },
    { icon: StickyNoteIcon, label: 'Ghi chú', value: profile.note, wide: true },
  ];

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b bg-accent/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
            <DropletsIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Loại da</p>
            <p className="font-heading text-lg font-semibold">{skinTypeLabel(profile.skinType)}</p>
          </div>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground sm:text-right">
          <p className="flex items-center gap-1.5 sm:justify-end">
            <UserRoundIcon className="size-3.5" aria-hidden="true" />
            {`Đánh giá bởi ${profile.assessedBy.fullName}`}
          </p>
          <p className="flex items-center gap-1.5 sm:justify-end">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {formatDateTimeUtc(profile.assessedAtUtc)}
            {profile.updatedAtUtc && ` · cập nhật ${formatDateTimeUtc(profile.updatedAtUtc)}`}
          </p>
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-5">
        {fields.map(({ icon: Icon, label, value, wide }) => (
          <section
            key={label}
            aria-label={label}
            className={cn('flex gap-3', wide && 'sm:col-span-2')}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-xs text-muted-foreground">{label}</h3>
              {value ? (
                <p className="text-sm break-words whitespace-pre-line text-foreground">{value}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Chưa ghi</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
