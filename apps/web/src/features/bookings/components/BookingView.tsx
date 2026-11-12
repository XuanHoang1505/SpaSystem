import { ClockIcon, SparklesIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AvailabilitySource } from '@spa/api-client';
import type { BookNowRequest, OrderRequest } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/shared/FormField/FormField';
import {
  OrdersBreadcrumb,
  OrdersErrorState,
  PromotionField,
  checkoutPath,
  useOrderPreview,
} from '@/features/orders';
import { redirectTo } from '@/features/payments/redirect';
import { useStartPayment } from '@/features/payments/hooks/useStartPayment';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency, formatDuration, formatLocalDate } from '@/lib/formatting/formatters';
import { addDays, vietnamDateOf, vietnamNow } from '@/lib/formatting/vietnamTime';
import { newUuid } from '@/lib/uuid';
import { parseBookingParams, type BookingPrefill, type BookingSource } from '../bookingParams';
import { bookingErrorKind, errorMessageOf } from '../errors';
import { useAvailability } from '../hooks/useAvailability';
import { useBookAppointment } from '../hooks/useBookAppointment';
import { useBookNow } from '../hooks/useBookNow';
import { useBookingSource, type ResolvedSource } from '../hooks/useBookingSource';
import { anyStaffTimes } from '../slots';
import { BookingConflictDialog } from './BookingConflictDialog';
import { BookingSummaryCard } from './BookingSummaryCard';
import { DateStrip } from './DateStrip';
import { StaffSlotPicker, type PickedSlot } from './StaffSlotPicker';

/** Longest note the API accepts. */
const NOTE_MAX = 500;

const availabilitySource = (source: BookingSource, resolved: ResolvedSource): AvailabilitySource =>
  source.kind === 'service'
    ? { spaServiceId: resolved.spaServiceId }
    : source.kind === 'entitlement'
      ? { serviceEntitlementId: source.serviceEntitlementId }
      : { treatmentSessionId: source.treatmentSessionId };

/** SCR-W13 — Đặt lịch hẹn (UC-SPA-15): one page, book now (pay) or use a bought service or package session. */
export function BookingView({ search }: { search: URLSearchParams }) {
  useDocumentTitle('Đặt lịch hẹn');
  const params = parseBookingParams(search);
  if (!params.ok)
    return (
      <EmptyState
        title="Liên kết đặt lịch không hợp lệ"
        description="Hãy chọn dịch vụ hoặc gói bạn muốn đặt lịch."
        action={
          <Button asChild>
            <Link to="/services">Xem dịch vụ</Link>
          </Button>
        }
      />
    );
  return <BookingFlow source={params.source} prefill={params.prefill} />;
}

function BookingFlow({ source, prefill }: { source: BookingSource; prefill: BookingPrefill }) {
  const resolved = useBookingSource(source);
  const flow = source.kind === 'service' ? 'book_now' : 'entitlement';
  const serviceName = resolved.data?.name;
  const trail =
    flow === 'entitlement'
      ? [
          { label: 'Trang chủ', to: '/' },
          { label: 'Tài khoản', to: '/account' },
          { label: 'Gói của tôi', to: '/my-packages' },
          ...(serviceName ? [{ label: serviceName }] : []),
          { label: 'Đặt lịch' },
        ]
      : [
          { label: 'Trang chủ', to: '/' },
          { label: 'Dịch vụ', to: '/services' },
          ...(serviceName && source.kind === 'service'
            ? [{ label: serviceName, to: `/services/${source.serviceId}` }]
            : []),
          { label: 'Đặt lịch' },
        ];

  let body;
  if (resolved.isPending)
    body = (
      <div
        data-testid="booking-skeleton"
        className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  else if (resolved.error) {
    const kind = bookingErrorKind(resolved.error);
    body =
      source.kind === 'service' && kind !== 'network' && kind !== 'other' ? (
        <NotFoundService />
      ) : kind === 'not_eligible' ? (
        <EmptyState
          title="Không tìm thấy quyền sử dụng"
          description="Quyền này không tồn tại, đã dùng hết hoặc không thuộc tài khoản của bạn."
          action={
            <Button asChild>
              <Link to="/my-packages">Về Gói của tôi</Link>
            </Button>
          }
        />
      ) : (
        <OrdersErrorState
          error={resolved.error}
          title="Không tải được thông tin đặt lịch"
          onRetry={resolved.refetch}
          retrying={false}
        />
      );
  } else if (resolved.data)
    body = (
      <BookingForm
        source={source}
        resolved={resolved.data}
        prefill={prefill}
        onReload={resolved.refetch}
      />
    );

  return (
    <div className="space-y-2">
      <OrdersBreadcrumb trail={trail} />
      <PageHeader
        title="Đặt lịch hẹn"
        description={
          flow === 'entitlement'
            ? 'Khấu trừ trực tiếp vào quyền bạn đã thanh toán, không phát sinh chi phí thêm.'
            : 'Chọn ngày, giờ và kỹ thuật viên phù hợp với bạn.'
        }
      />
      {body}
    </div>
  );
}

function NotFoundService() {
  return (
    <EmptyState
      title="Không tìm thấy dịch vụ"
      description="Dịch vụ này không còn bán hoặc không tồn tại."
      action={
        <Button asChild>
          <Link to="/services">Xem dịch vụ</Link>
        </Button>
      }
    />
  );
}

function SourceCard({ source }: { source: ResolvedSource }) {
  const sequence =
    source.sequenceNumber !== undefined
      ? source.totalSessions
        ? `Buổi ${source.sequenceNumber}/${source.totalSessions}`
        : `Buổi ${source.sequenceNumber}`
      : null;

  return (
    <section
      aria-label="Thông tin đặt lịch"
      className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-muted sm:size-24">
          <ImageWithFallback
            src={source.imageUrl ?? null}
            alt={source.name}
            fallbackIcon={SparklesIcon}
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {sequence && (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {sequence}
              </span>
            )}
            {source.kind === 'entitlement' && (
              <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                Dịch vụ đã mua
              </span>
            )}
            {source.packageName && (
              <span className="text-xs font-medium text-muted-foreground">
                {source.packageName}
              </span>
            )}
          </div>

          <h2 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">
            {source.name}
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              <ClockIcon className="size-3 text-primary" aria-hidden="true" />
              {formatDuration(source.durationMinutes)}
            </span>
            {source.kind === 'service' && source.price !== undefined && (
              <span className="font-heading text-base font-semibold text-primary">
                {formatCurrency(source.price)}
              </span>
            )}
            {source.kind !== 'service' && source.remainingSessions !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
                <SparklesIcon className="size-3 text-primary" aria-hidden="true" />
                {`Bạn còn ${source.remainingSessions} buổi sẵn sàng sử dụng`}
              </span>
            )}
            {source.kind !== 'service' && (
              <span>
                {source.expiresAtUtc
                  ? `hạn đến ${formatLocalDate(vietnamDateOf(source.expiresAtUtc))}`
                  : 'không giới hạn thời gian'}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BookingForm({
  source,
  resolved,
  prefill,
  onReload,
}: {
  source: BookingSource;
  resolved: ResolvedSource;
  prefill: BookingPrefill;
  onReload: () => void;
}) {
  const navigate = useNavigate();
  const flow = source.kind === 'service' ? 'book_now' : 'entitlement';
  const [today] = useState(() => vietnamNow());
  const minDate =
    resolved.earliestDate && resolved.earliestDate > today.date
      ? resolved.earliestDate
      : today.date;
  const maxDate = addDays(today.date, catalogPolicies.maxBookingDaysAhead);
  const [date, setDate] = useState(() =>
    prefill.date && prefill.date >= minDate && prefill.date <= maxDate ? prefill.date : minDate,
  );
  const [picked, setPicked] = useState<PickedSlot | null>(
    prefill.startTime
      ? {
          startTime: prefill.startTime,
          ...(prefill.staffMemberId ? { staffMemberId: prefill.staffMemberId } : {}),
        }
      : null,
  );
  const [code, setCode] = useState<string | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState<{ message: string; toPackages?: boolean } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [note, setNote] = useState('');
  const busy = useRef(false);
  const keyRef = useRef<{ signature: string; key: string } | null>(null);

  const bookNow = useBookNow();
  const book = useBookAppointment();
  const startPayment = useStartPayment();
  const availability = useAvailability(
    resolved.canBook ? availabilitySource(source, resolved) : null,
    date,
  );
  const previewRequest: OrderRequest | null =
    flow === 'book_now'
      ? {
          source: 'buy_now',
          spaServiceId: resolved.spaServiceId,
          ...(code ? { promotionCode: code } : {}),
        }
      : null;
  const preview = useOrderPreview(previewRequest);

  const day = availability.data && availability.data.date === date ? availability.data : undefined;
  // A picked hour that the loaded day no longer offers is dropped (a prefill may be stale).
  const slot =
    picked &&
    (!day ||
      (picked.staffMemberId === undefined
        ? anyStaffTimes(day).includes(picked.startTime)
        : day.staff.some(
            (member) =>
              member.id === picked.staffMemberId &&
              member.slots.some((item) => item.startTime === picked.startTime),
          )))
      ? picked
      : null;
  const staffName = slot?.staffMemberId
    ? day?.staff.find((member) => member.id === slot.staffMemberId)?.fullName
    : undefined;

  const effectiveCode = preview.data?.promotionError ? undefined : (code ?? undefined);
  const keyFor = (body: BookNowRequest) => {
    const signature = JSON.stringify(body);
    if (keyRef.current?.signature !== signature) keyRef.current = { signature, key: newUuid() };
    return keyRef.current.key;
  };

  const reloadSlots = () => void availability.refetch();
  const dropSlot = () => setPicked(null);

  const fail = (error: unknown) => {
    busy.current = false;
    const kind = bookingErrorKind(error);
    const message = errorMessageOf(error);
    switch (kind) {
      case 'slot_taken':
        setConflict(true);
        break;
      case 'in_past':
        toast.error('Giờ này đã qua');
        dropSlot();
        reloadSlots();
        break;
      case 'too_soon':
        toast.error(message ?? 'Giờ này quá gần, vui lòng chọn giờ muộn hơn.');
        reloadSlots();
        break;
      case 'staff':
        toast.error('Kỹ thuật viên này không còn nhận dịch vụ này');
        dropSlot();
        reloadSlots();
        break;
      case 'session_too_early':
      case 'session_too_late':
        setNotice({ message: message ?? 'Buổi này chưa thể đặt vào thời điểm đã chọn.' });
        onReload();
        break;
      case 'not_eligible':
        setNotice({ message: message ?? 'Quyền này không còn dùng được.', toPackages: true });
        break;
      case 'service_gone':
        setGone(true);
        break;
      case 'promotion':
        setPromotionMessage(message ?? 'Mã khuyến mãi không áp dụng được.');
        void preview.refetch();
        break;
      case 'amount_too_small':
        setSubmitError(message ?? 'Giá trị thanh toán tối thiểu là 5.000 đ.');
        break;
      case 'validation':
        toast.error('Dữ liệu không hợp lệ');
        reloadSlots();
        break;
      case 'network':
        toast.error('Không kết nối được máy chủ');
        break;
      default:
        setSubmitError('Đã có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const confirm = async () => {
    if (busy.current || !slot) return;
    busy.current = true;
    setSubmitError(null);
    setNotice(null);
    const base = {
      date,
      startTime: slot.startTime,
      ...(slot.staffMemberId ? { staffMemberId: slot.staffMemberId } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    if (flow === 'entitlement') {
      try {
        const appointment = await book.mutateAsync({
          ...(source.kind === 'entitlement'
            ? { serviceEntitlementId: source.serviceEntitlementId }
            : source.kind === 'session'
              ? { treatmentSessionId: source.treatmentSessionId }
              : {}),
          ...base,
        });
        // Leaving the page: stay busy so a late second click cannot book again.
        navigate(`/booking/success?appointmentId=${appointment.id}`);
      } catch (error) {
        fail(error);
      }
      return;
    }
    const body: BookNowRequest = {
      spaServiceId: resolved.spaServiceId,
      ...base,
      ...(effectiveCode ? { promotionCode: effectiveCode } : {}),
    };
    let result;
    try {
      result = await bookNow.mutateAsync({ body, idempotencyKey: keyFor(body) });
    } catch (error) {
      fail(error);
      return;
    }
    if (result.order.status === 'paid') {
      navigate(`/booking/success?appointmentId=${result.appointment.id}`);
      return;
    }
    try {
      const attempt = await startPayment.mutateAsync(result.order.id);
      redirectTo(attempt.paymentUrl);
    } catch {
      // The slot is held and the order exists: pay from the checkout page, never book again.
      toast.error(
        'Chưa tạo được giao dịch thanh toán. Bạn có thể thanh toán lại ở bước tiếp theo.',
      );
      navigate(checkoutPath({ orderId: result.order.id }), { replace: true });
    }
  };

  if (gone) return <NotFoundService />;

  const card = (
    <BookingSummaryCard
      source={resolved}
      date={date}
      slot={slot}
      staffName={staffName}
      flow={flow}
      preview={preview.data}
      promotion={
        flow === 'book_now' ? (
          <PromotionField
            applied={preview.data?.promotion ?? null}
            error={
              preview.data?.promotionError ??
              (promotionMessage ? { code: 'promotion_invalid', message: promotionMessage } : null)
            }
            pending={preview.isFetching}
            onApply={(value) => {
              setPromotionMessage(null);
              setCode(value);
            }}
            onRemove={() => {
              setPromotionMessage(null);
              setCode(null);
            }}
          />
        ) : undefined
      }
      error={submitError ?? undefined}
      submitting={bookNow.isPending || book.isPending || startPayment.isPending}
      disabled={!resolved.canBook}
      onConfirm={() => void confirm()}
    />
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 pb-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0">
      <div className="min-w-0 space-y-6">
        <SourceCard source={resolved} />
        {notice && (
          <Alert variant="destructive" role="alert">
            <AlertDescription className="space-y-2">
              <p>{notice.message}</p>
              {notice.toPackages && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/my-packages">Về Gói của tôi</Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        <section
          aria-labelledby="pick-title"
          className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs sm:p-6"
        >
          <h2
            id="pick-title"
            className="font-heading text-lg font-semibold text-foreground sm:text-xl"
          >
            1. Chọn ngày, giờ và kỹ thuật viên
          </h2>
          {!resolved.canBook ? (
            <Alert>
              <AlertDescription>
                {resolved.reason ?? 'Buổi này chưa thể đặt lịch.'}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <DateStrip
                value={date}
                minDate={minDate}
                maxDate={maxDate}
                onChange={(next) => {
                  setDate(next);
                  setPicked(null);
                }}
              />
              {availability.isError ? (
                <ErrorState
                  title="Không tải được giờ trống"
                  onRetry={reloadSlots}
                  retrying={availability.isFetching}
                />
              ) : !day ? (
                <div data-testid="slots-skeleton" className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <StaffSlotPicker
                  availability={day}
                  date={date}
                  selected={slot}
                  onSelect={setPicked}
                  now={today}
                />
              )}
            </>
          )}
        </section>
        {resolved.canBook && (
          <section
            aria-labelledby="note-title"
            className="space-y-3.5 rounded-2xl border bg-card p-5 shadow-xs sm:p-6"
          >
            <h2
              id="note-title"
              className="font-heading text-lg font-semibold text-foreground sm:text-xl"
            >
              2. Ghi chú cho kỹ thuật viên
            </h2>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {[
                'Da nhạy cảm, tránh lực mạnh',
                'Tránh tinh dầu mùi nồng',
                'Cần soi da trước buổi hẹn',
                'Có thể đến trễ 5–10 phút',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    if (note.includes(chip)) return;
                    const next = note ? `${note.trim()}, ${chip}` : chip;
                    if (next.length <= NOTE_MAX) setNote(next);
                  }}
                  className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <FormField label="Ghi chú (không bắt buộc)">
              <Textarea
                rows={3}
                maxLength={NOTE_MAX}
                value={note}
                placeholder="Ví dụ: da nhạy cảm, tránh tinh dầu mạnh; tôi sẽ đến trễ vài phút."
                onChange={(event) => setNote(event.target.value)}
              />
            </FormField>
            <p className="text-right text-xs text-muted-foreground">{`${note.length}/${NOTE_MAX}`}</p>
          </section>
        )}
      </div>
      {card}
      <BookingConflictDialog
        open={conflict}
        onChoose={() => {
          setConflict(false);
          dropSlot();
          reloadSlots();
        }}
      />
    </div>
  );
}
