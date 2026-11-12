import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { ChevronDownIcon, InfoIcon } from 'lucide-react';
import type { AppointmentListItem, PagedResponse } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { cn } from '@/lib/utils';
import { appointmentStatusBadge } from '../../appointmentStatus';
import { DayCalendarCard } from './DayCalendarCard';
import {
  buildColumns,
  dropId,
  fromMinutes,
  gridRange,
  isDraggable,
  parseDropId,
  placeCard,
  resolveDrop,
  splitByGrid,
  toMinutes,
  type DropCommand,
} from './dayGrid';

export interface DayCalendarProps {
  date: string;
  today: { date: string; time: string };
  query: {
    data?: PagedResponse<AppointmentListItem>;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
    refetch: () => void;
  };
  staff: readonly { id: string; fullName: string }[];
  staffFilter?: string;
  onOpen: (appointmentId: string) => void;
  onDropCommand?: (appointment: AppointmentListItem, command: DropCommand) => void;
  busyAppointmentId?: string | null;
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(min-width: 768px)').matches
      : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

function DroppableSlotCell({
  staffId,
  startTime,
  rowStart,
  colIndex,
}: {
  staffId: string;
  startTime: string;
  rowStart: number;
  colIndex: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId({ staffId, startTime }),
  });

  return (
    <div
      ref={setNodeRef}
      style={{ gridRow: `${rowStart} / span 6`, gridColumn: colIndex + 2 }}
      className={cn(
        'border-t border-r border-border/40 transition-colors',
        isOver && 'bg-primary/10',
      )}
    />
  );
}

function DraggableCalendarCard({
  appointment,
  placement,
  colIndex,
  onOpen,
  isBusy,
  disabled,
}: {
  appointment: AppointmentListItem;
  placement: { rowStart: number; rowSpan: number; lane: number; laneCount: number };
  colIndex: number;
  onOpen: (id: string) => void;
  isBusy?: boolean;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    disabled,
  });

  return (
    <DayCalendarCard
      appointment={appointment}
      placement={placement}
      colIndex={colIndex}
      onOpen={onOpen}
      isBusy={isBusy}
      dragRef={setNodeRef}
      gripAttributes={attributes}
      gripListeners={listeners}
      style={isDragging ? { opacity: 0.3 } : undefined}
    />
  );
}

function DayCalendarOverlayCard({
  appointment,
  overId,
}: {
  appointment: AppointmentListItem;
  overId: string | null;
}) {
  const badge = appointmentStatusBadge(appointment.status);
  let timeText = `${appointment.startTime} – ${appointment.endTime}`;

  if (overId) {
    const target = parseDropId(overId);
    if (target && target.staffId === appointment.staff.id) {
      const duration = toMinutes(appointment.endTime) - toMinutes(appointment.startTime);
      const newEnd = fromMinutes(toMinutes(target.startTime) + duration);
      timeText = `${target.startTime} – ${newEnd}`;
    }
  }

  return (
    <div className="w-[180px] rounded-md border-2 border-primary bg-card p-2 shadow-lg ring-2 ring-primary/20">
      <div className="text-[11px] font-semibold text-primary">{timeText}</div>
      <p className="truncate text-xs font-medium text-foreground">
        {appointment.customer.fullName}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{appointment.service.name}</p>
      <div className="mt-1">
        <StatusBadge label={badge.label} tone={badge.tone} className="px-1 py-0 text-[10px]" />
      </div>
    </div>
  );
}

export function DayCalendar({
  date,
  today,
  query,
  staff,
  staffFilter,
  onOpen,
  onDropCommand,
  busyAppointmentId,
}: DayCalendarProps) {
  const isDesktop = useIsDesktop();
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const { onGrid, cancelled } = splitByGrid(query.data?.items ?? []);
  const columns = buildColumns(staff, onGrid, staffFilter);

  const staffMap = useMemo(() => {
    const map = new Map<string, { id: string; fullName: string }>();
    for (const c of columns) {
      map.set(c.staffId, { id: c.staffId, fullName: c.fullName });
    }
    return map;
  }, [columns]);

  const activeAppointment = useMemo(
    () => onGrid.find((a) => a.id === activeAppointmentId) ?? null,
    [onGrid, activeAppointmentId],
  );

  const announcements = {
    onDragStart({ active }: { active: { id: UniqueIdentifier } }) {
      const appt = onGrid.find((a) => a.id === active.id);
      return appt ? `Đã nhấc lịch của ${appt.customer.fullName}` : '';
    },
    onDragOver({ over }: { over: { id: UniqueIdentifier } | null }) {
      if (!over) return '';
      const target = parseDropId(String(over.id));
      if (!target) return '';
      const staffMember = staffMap.get(target.staffId);
      return `Đang ở ${target.startTime}, cột ${staffMember?.fullName ?? ''}`;
    },
    onDragEnd({ over }: { over: { id: UniqueIdentifier } | null }) {
      if (!over) return 'Đã hủy kéo lịch';
      const target = parseDropId(String(over.id));
      if (!target) return 'Đã thả lịch';
      const staffMember = staffMap.get(target.staffId);
      return `Đã thả lịch vào ${target.startTime}, cột ${staffMember?.fullName ?? ''}`;
    },
    onDragCancel() {
      return 'Đã hủy kéo lịch';
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveAppointmentId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAppointmentId(null);
    setOverId(null);

    if (!over) return;
    const target = parseDropId(String(over.id));
    if (!target) return;

    const appt = onGrid.find((a) => a.id === active.id);
    if (!appt) return;

    const command = resolveDrop(appt, target);
    if (!command) return;

    onDropCommand?.(appt, command);
  };

  const handleDragCancel = () => {
    setActiveAppointmentId(null);
    setOverId(null);
  };

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (query.isError) {
    return <ErrorState onRetry={() => void query.refetch()} />;
  }

  if (columns.length === 0) {
    return (
      <EmptyState
        title="Không có nhân viên"
        description="Không có nhân viên nào phù hợp để hiển thị lịch ngày."
      />
    );
  }

  const range = gridRange(
    onGrid,
    catalogPolicies.dayGridStartTime,
    catalogPolicies.dayGridEndTime,
    30,
  );
  const total5MinRows = Math.round((range.endMinutes - range.startMinutes) / 5);

  const isToday = date === today.date;
  const nowMinutes = toMinutes(today.time);
  const showNowLine = isToday && nowMinutes >= range.startMinutes && nowMinutes <= range.endMinutes;
  const nowRow = showNowLine ? Math.floor((nowMinutes - range.startMinutes) / 5) + 2 : null;

  return (
    <div className="space-y-4">
      {/* Total count warning */}
      {query.data && query.data.totalCount > 100 && (
        <Alert>
          <InfoIcon className="size-4" />
          <AlertDescription>
            Ngày này có hơn 100 lịch, đang hiện 100 lịch đầu. Dùng tab Danh sách để xem đủ.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty day notice */}
      {query.data && query.data.totalCount === 0 && (
        <p className="text-sm text-muted-foreground">Không có lịch hẹn nào trong ngày này</p>
      )}

      {/* Calendar Grid Container wrapped in DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        accessibility={{ announcements }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="relative max-h-[calc(100vh-280px)] min-h-[500px] overflow-auto rounded-lg border bg-background">
          <div
            className="grid w-full"
            style={{
              gridTemplateColumns: `64px repeat(${columns.length}, minmax(180px, 1fr))`,
              gridTemplateRows: `44px repeat(${total5MinRows}, 8px)`,
            }}
          >
            {/* Top-left corner cell */}
            <div
              style={{ gridRow: 1, gridColumn: 1 }}
              className="sticky top-0 left-0 z-30 border-r border-b bg-background p-2 text-center text-xs font-semibold text-muted-foreground"
            >
              Giờ
            </div>

            {/* Staff Column Headers */}
            {columns.map((col, colIdx) => (
              <div
                key={col.staffId}
                style={{ gridRow: 1, gridColumn: colIdx + 2 }}
                className="sticky top-0 z-20 border-r border-b bg-background p-2 text-center"
              >
                <div className="truncate text-sm font-medium">{col.fullName}</div>
                <div className="text-xs text-muted-foreground">{col.appointments.length} lịch</div>
              </div>
            ))}

            {/* Background time labels and droppable cells */}
            {range.slots.map((slotTime, slotIdx) => {
              const rowStart = slotIdx * 6 + 2;
              return (
                <div key={slotTime} className="contents">
                  {/* Time label */}
                  <div
                    style={{ gridRow: `${rowStart} / span 6`, gridColumn: 1 }}
                    className="sticky left-0 z-10 border-t border-r border-border/40 bg-background px-2 pt-1 font-mono text-[11px] text-muted-foreground select-none"
                  >
                    {slotTime}
                  </div>

                  {/* Column droppable cells */}
                  {columns.map((col, colIdx) => (
                    <DroppableSlotCell
                      key={`${col.staffId}-${slotTime}`}
                      staffId={col.staffId}
                      startTime={slotTime}
                      rowStart={rowStart}
                      colIndex={colIdx}
                    />
                  ))}
                </div>
              );
            })}

            {/* Now-line */}
            {showNowLine && nowRow !== null && (
              <div
                data-testid="day-now-line"
                style={{ gridRow: `${nowRow} / span 1`, gridColumn: '1 / -1' }}
                className="pointer-events-none z-20 flex items-center"
              >
                <div className="w-16 pr-1 text-right text-[10px] font-bold text-destructive">
                  {today.time}
                </div>
                <div className="relative h-[2px] flex-1 bg-destructive">
                  <div className="absolute -top-1 -left-1 size-2 rounded-full bg-destructive" />
                </div>
              </div>
            )}

            {/* Appointment Cards */}
            {columns.map((col, colIdx) =>
              col.appointments.map((appt) => {
                const placement = placeCard(appt, col.appointments, range.startMinutes);
                const isBusy = busyAppointmentId === appt.id;
                const canDrag = isDraggable(appt.status) && isDesktop && !busyAppointmentId;

                return (
                  <DraggableCalendarCard
                    key={appt.id}
                    appointment={appt}
                    placement={placement}
                    colIndex={colIdx}
                    onOpen={onOpen}
                    isBusy={isBusy}
                    disabled={!canDrag}
                  />
                );
              }),
            )}
          </div>
        </div>

        <DragOverlay>
          {activeAppointment ? (
            <DayCalendarOverlayCard appointment={activeAppointment} overId={overId} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Cancelled appointments section */}
      {cancelled.length > 0 && (
        <Collapsible className="rounded-lg border bg-muted/20 p-3">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-auto w-full items-center justify-between p-0 text-sm font-medium"
            >
              <span>Lịch đã hủy trong ngày ({cancelled.length})</span>
              <ChevronDownIcon className="size-4 transition-transform duration-200" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {cancelled.map((appt) => {
              const badge = appointmentStatusBadge(appt.status);
              return (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => onOpen(appt.id)}
                  className="flex w-full flex-wrap items-center justify-between rounded-md border bg-card p-2.5 text-left text-sm transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {appt.startTime} – {appt.endTime}
                    </span>
                    <span className="font-medium text-foreground">{appt.customer.fullName}</span>
                    <span className="text-xs text-muted-foreground">{appt.service.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{appt.staff.fullName}</span>
                    <StatusBadge label={badge.label} tone={badge.tone} />
                  </div>
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
