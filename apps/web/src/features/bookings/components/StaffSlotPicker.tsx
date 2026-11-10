import { ClockIcon, SparklesIcon, SunriseIcon, SunsetIcon, UserRoundIcon } from 'lucide-react';
import type { Availability } from '@spa/shared-types';
import { cn } from '@/lib/utils';
import { anyStaffTimes, hideElapsed } from '../slots';

export interface PickedSlot {
  startTime: string;
  staffMemberId?: string;
}

const choice = (selected: boolean) =>
  cn(
    'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium shadow-2xs transition-all',
    selected
      ? 'border-primary bg-primary font-semibold text-primary-foreground shadow-xs'
      : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/40',
  );

export function StaffSlotPicker({
  availability,
  date,
  selected,
  onSelect,
  currentStaffId,
  fixedStaffId,
  emptyText,
  now,
}: {
  availability: Availability;
  date: string;
  selected: PickedSlot | null;
  onSelect: (slot: PickedSlot) => void;
  currentStaffId?: string;
  fixedStaffId?: string;
  emptyText?: string;
  now: { date: string; time: string };
}) {
  const times = hideElapsed(anyStaffTimes(availability), date, now);
  if (times.length === 0)
    return (
      <p className="rounded-xl bg-muted/50 p-4 text-sm">{emptyText ?? 'Ngày này đã kín lịch'}</p>
    );

  const chosen = selected && times.includes(selected.startTime) ? selected.startTime : null;
  const staff = chosen
    ? availability.staff.filter((member) => member.slots.some((slot) => slot.startTime === chosen))
    : [];

  const periods = [
    { label: 'Sáng', Icon: SunriseIcon, times: times.filter((time) => time < '12:00') },
    { label: 'Chiều', Icon: SunsetIcon, times: times.filter((time) => time >= '12:00') },
  ].filter((period) => period.times.length > 0);

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Chọn giờ" className="space-y-3.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ClockIcon className="size-4 text-primary" aria-hidden="true" />
          Chọn giờ
        </p>
        {periods.map(({ label, Icon, times: periodTimes }) => (
          <div key={label} className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Icon className="size-3.5 text-primary" aria-hidden="true" />
              {label}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {periodTimes.map((time) => (
                <button
                  key={time}
                  type="button"
                  aria-pressed={chosen === time}
                  onClick={() =>
                    onSelect({
                      startTime: time,
                      ...(fixedStaffId ? { staffMemberId: fixedStaffId } : {}),
                    })
                  }
                  className={cn(
                    'rounded-xl border px-2 py-2 text-center text-sm font-medium tabular-nums shadow-2xs transition-all',
                    chosen === time
                      ? 'border-primary bg-primary font-semibold text-primary-foreground shadow-xs'
                      : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/40',
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!fixedStaffId &&
        (chosen ? (
          <div role="group" aria-label="Chọn kỹ thuật viên" className="space-y-2.5 border-t pt-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRoundIcon className="size-4 text-primary" aria-hidden="true" />
              {`Kỹ thuật viên rảnh lúc ${chosen}`}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {(() => {
                const isAnySelected = selected?.staffMemberId === undefined;
                return (
                  <button
                    type="button"
                    aria-pressed={isAnySelected}
                    onClick={() => onSelect({ startTime: chosen })}
                    className={choice(isAnySelected)}
                  >
                    <SparklesIcon
                      className={cn(
                        'size-4 shrink-0 transition-colors',
                        isAnySelected ? 'text-primary-foreground' : 'text-primary',
                      )}
                      aria-hidden="true"
                    />
                    Kỹ thuật viên bất kỳ
                  </button>
                );
              })()}
              {staff.map((member) => {
                const isSelected = selected?.staffMemberId === member.id;
                return (
                  <div key={member.id} className="flex flex-col items-start gap-1">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelect({ startTime: chosen, staffMemberId: member.id })}
                      className={choice(isSelected)}
                    >
                      <UserRoundIcon
                        className={cn(
                          'size-4 shrink-0 transition-colors',
                          isSelected ? 'text-primary-foreground' : 'text-primary',
                        )}
                        aria-hidden="true"
                      />
                      {member.fullName}
                    </button>
                    {member.id === currentStaffId && (
                      <span className="text-xs text-muted-foreground">
                        Đang là kỹ thuật viên của lịch này
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
            Vui lòng chọn một khung giờ phía trên để xem các kỹ thuật viên sẵn sàng phục vụ.
          </div>
        ))}
    </div>
  );
}
