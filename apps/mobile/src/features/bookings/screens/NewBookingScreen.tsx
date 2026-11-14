import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MessageSquareText } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { BookingSourceCard } from '../components/BookingSourceCard';
import { BookingSummaryCard } from '../components/BookingSummaryCard';
import { DateStripPicker } from '../components/DateStripPicker';
import { StaffSlotPicker } from '../components/StaffSlotPicker';
import { useAvailability } from '../hooks/useAvailability';
import { useBookAppointment } from '../hooks/useBookAppointment';
import { useBookingSource } from '../hooks/useBookingSource';
import { bookingNoteSchema } from '../schemas';
import {
  anyStaffTimes,
  classifyBookingError,
  findEndTimeForStartTime,
  getTodayVnNow,
  parseBookingSourceParams,
  quickNoteSuggestions,
  resolveInitialBookingDate,
  toAvailabilitySource,
  type PickedSlot,
} from '../utils/bookingHelpers';

const NOTE_MAX = 500;

export function NewBookingScreen() {
  const insets = useSafeAreaInsets();

  const rawParams = useLocalSearchParams<{
    serviceId?: string;
    serviceEntitlementId?: string;
    treatmentSessionId?: string;
    treatmentPlanId?: string;
    date?: string;
    startTime?: string;
    staffMemberId?: string;
  }>();

  const parsedSource = useMemo(
    () =>
      parseBookingSourceParams({
        serviceId: rawParams.serviceId,
        serviceEntitlementId: rawParams.serviceEntitlementId,
        treatmentSessionId: rawParams.treatmentSessionId,
        treatmentPlanId: rawParams.treatmentPlanId,
        date: rawParams.date,
        startTime: rawParams.startTime,
        staffMemberId: rawParams.staffMemberId,
      }),
    [
      rawParams.serviceId,
      rawParams.serviceEntitlementId,
      rawParams.treatmentSessionId,
      rawParams.treatmentPlanId,
      rawParams.date,
      rawParams.startTime,
      rawParams.staffMemberId,
    ],
  );

  const [today] = useState(() => getTodayVnNow());

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    resolveInitialBookingDate(
      today.date,
      null,
      parsedSource.valid ? parsedSource.initialDate : null,
    ),
  );
  const [picked, setPicked] = useState<PickedSlot | null>(() =>
    parsedSource.valid && parsedSource.initialStartTime
      ? {
          startTime: parsedSource.initialStartTime,
          ...(parsedSource.initialStaffMemberId
            ? { staffMemberId: parsedSource.initialStaffMemberId }
            : {}),
        }
      : null,
  );
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sourceQuery = useBookingSource(parsedSource);
  const sourceData = sourceQuery.data;

  // Adjust selectedDate if session has earliestDate later than current selectedDate
  useEffect(() => {
    if (sourceData?.earliestDate && selectedDate < sourceData.earliestDate) {
      setSelectedDate(sourceData.earliestDate);
      setPicked(null);
    }
  }, [sourceData?.earliestDate, selectedDate]);

  const availabilitySource = useMemo(
    () => (parsedSource.valid ? toAvailabilitySource(parsedSource) : null),
    [parsedSource],
  );

  const availabilityQuery = useAvailability(
    availabilitySource,
    selectedDate,
    Boolean(parsedSource.valid && sourceData?.canBook),
  );

  const staffList = useMemo(() => availabilityQuery.data?.staff ?? [], [availabilityQuery.data]);

  // Validate picked slot against currently loaded availability
  const validSlot: PickedSlot | null = useMemo(() => {
    if (!picked) return null;
    if (!availabilityQuery.data) return picked;
    if (picked.staffMemberId === undefined) {
      return anyStaffTimes(staffList).includes(picked.startTime) ? picked : null;
    }
    const matchesStaff = staffList.some(
      (member) =>
        member.id === picked.staffMemberId &&
        member.slots.some((slot) => slot.startTime.slice(0, 5) === picked.startTime),
    );
    return matchesStaff ? picked : null;
  }, [picked, availabilityQuery.data, staffList]);

  const selectedEndTime = useMemo(
    () => findEndTimeForStartTime(staffList, validSlot?.startTime),
    [staffList, validSlot?.startTime],
  );

  const bookAppointmentMutation = useBookAppointment();

  const isBookNowFlow = parsedSource.valid && parsedSource.kind === 'service';
  const isSubmitting = bookAppointmentMutation.isPending;

  const serviceDisplayName =
    sourceData?.kind === 'service'
      ? sourceData.service.name
      : sourceData?.kind === 'entitlement'
        ? sourceData.entitlement.serviceName
        : sourceData?.kind === 'session'
          ? `Buổi ${sourceData.session.sequenceNumber}: ${sourceData.session.serviceName}`
          : 'Dịch vụ chăm sóc';

  const selectedStaffName = validSlot?.staffMemberId
    ? (staffList.find((s) => s.id === validSlot.staffMemberId)?.fullName ??
      sourceData?.primaryStaffName ??
      'Kỹ thuật viên đã chọn')
    : 'Kỹ thuật viên bất kỳ';

  const price = sourceData?.kind === 'service' ? sourceData.service.price : 0;

  const handleSubmit = async () => {
    if (!parsedSource.valid || !sourceData?.canBook || !validSlot) {
      return;
    }

    const noteValidation = bookingNoteSchema.safeParse(note);
    if (!noteValidation.success) {
      setNoteError(noteValidation.error.issues[0]?.message ?? 'Ghi chú không vượt quá 500 ký tự.');
      return;
    }

    setNoteError(null);
    setSubmitError(null);

    const trimmedNote = noteValidation.data || undefined;

    // Flow 1 (service): navigate to CheckoutScreen where customer can apply promo code and pay via VNPay
    if (parsedSource.kind === 'service') {
      const params = new URLSearchParams({
        source: 'buy_now',
        spaServiceId: parsedSource.serviceId,
        bookingDate: selectedDate,
        bookingStartTime: validSlot.startTime,
        bookingStaffName: selectedStaffName,
      });
      if (selectedEndTime) {
        params.set('bookingEndTime', selectedEndTime);
      }
      if (validSlot.staffMemberId) {
        params.set('bookingStaffId', validSlot.staffMemberId);
      }
      if (trimmedNote) {
        params.set('bookingNote', trimmedNote);
      }
      router.push(`/checkout?${params.toString()}`);
      return;
    }

    // Flow 2 (entitlement or treatment session): book immediately (0 VND)
    try {
      const appointment = await bookAppointmentMutation.mutateAsync({
        ...(parsedSource.kind === 'entitlement'
          ? { serviceEntitlementId: parsedSource.serviceEntitlementId }
          : { treatmentSessionId: parsedSource.treatmentSessionId }),
        date: selectedDate,
        startTime: validSlot.startTime,
        ...(validSlot.staffMemberId ? { staffMemberId: validSlot.staffMemberId } : {}),
        ...(trimmedNote ? { note: trimmedNote } : {}),
      });

      router.replace(`/booking/success?appointmentId=${appointment.id}`);
    } catch (err) {
      const classified = classifyBookingError(err);
      if (classified.shouldClearSlot || classified.shouldResetStaff) {
        setPicked(null);
      }
      if (classified.shouldRefetchAvailability) {
        void availabilityQuery.refetch();
      }
      if (classified.shouldRefetchSource) {
        void sourceQuery.refetch();
      }
      setSubmitError(classified.message);
    }
  };

  const existingAppointmentId =
    sourceData?.kind === 'entitlement'
      ? sourceData.entitlement.appointment?.id
      : sourceData?.kind === 'session'
        ? sourceData.session.appointment?.id
        : undefined;

  return (
    <AppScreen scroll={false} style={styles.screenContainer}>
      {/* Standalone Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(public)/services');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <AppText style={styles.headerTitle}>Đặt lịch hẹn</AppText>
          <AppText style={styles.headerSubtitle}>
            {isBookNowFlow
              ? 'Chọn ngày, giờ và kỹ thuật viên phù hợp với bạn'
              : 'Khấu trừ vào quyền đã mua, không phát sinh chi phí thêm'}
          </AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {!parsedSource.valid ? (
        <View style={styles.centerContainer}>
          <AppNotice
            tone="error"
            title="Không thể khởi tạo đặt lịch"
            message={parsedSource.error}
          />
          <View style={styles.centerAction}>
            <AppButton
              title="Khám phá dịch vụ"
              onPress={() => router.replace('/(public)/services')}
            />
          </View>
        </View>
      ) : sourceQuery.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={styles.loadingText}>Đang tải thông tin dịch vụ...</AppText>
        </View>
      ) : sourceQuery.isError || !sourceData ? (
        <View style={styles.centerContainer}>
          <AppNotice
            tone="error"
            title="Không tải được thông tin đặt lịch"
            message={
              sourceQuery.error?.message ??
              'Không tìm thấy dịch vụ hoặc quyền sử dụng cần đặt lịch.'
            }
          />
          <View style={styles.centerAction}>
            <AppButton title="Thử lại" onPress={() => void sourceQuery.refetch()} />
            <AppButton
              title="Khám phá dịch vụ"
              variant="outline"
              onPress={() => router.replace('/(public)/services')}
            />
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Source Info Card */}
            <BookingSourceCard source={sourceData} />

            {/* Ineligible Source Warning */}
            {!sourceData.canBook && (
              <View style={styles.ineligibleBox}>
                <AppNotice
                  tone="error"
                  title="Không thể đặt lịch cho mục này"
                  message={
                    sourceData.ineligibleReason ?? 'Mục này hiện không đủ điều kiện đặt lịch.'
                  }
                />
                {existingAppointmentId && (
                  <AppButton
                    title="Xem lịch hẹn đã đặt"
                    variant="outline"
                    onPress={() => router.replace(`/booking/${existingAppointmentId}`)}
                  />
                )}
              </View>
            )}

            {submitError && <AppNotice tone="error" message={submitError} />}

            {sourceData.canBook && (
              <>
                {/* Step 1: Date Picker */}
                <DateStripPicker
                  todayVn={today.date}
                  selectedDate={selectedDate}
                  earliestDate={sourceData.earliestDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setPicked(null);
                    setSubmitError(null);
                  }}
                />

                {/* Step 1b: Time Slot (Sáng/Chiều) -> Available Technicians */}
                <View style={styles.sectionCard}>
                  <StaffSlotPicker
                    staff={staffList}
                    date={selectedDate}
                    now={today}
                    selected={validSlot}
                    onSelect={(nextSlot) => {
                      setPicked(nextSlot);
                      setSubmitError(null);
                    }}
                    primaryStaffId={sourceData.primaryStaffId}
                    isLoading={availabilityQuery.isLoading}
                    isError={availabilityQuery.isError}
                    errorMessage={availabilityQuery.error?.message}
                    onRetry={() => void availabilityQuery.refetch()}
                  />
                </View>

                {/* Step 2: Customer Note with Quick Suggestion Chips */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <MessageSquareText size={16} color={colors.primary} />
                    <AppText style={styles.sectionTitle}>2. Ghi chú cho kỹ thuật viên</AppText>
                  </View>

                  <View style={styles.noteChipsWrap}>
                    {quickNoteSuggestions.map((chip) => (
                      <Pressable
                        key={chip}
                        onPress={() => {
                          if (note.includes(chip)) return;
                          const next = note.trim() ? `${note.trim()}, ${chip}` : chip;
                          if (next.length <= NOTE_MAX) {
                            setNote(next);
                            if (noteError) setNoteError(null);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Thêm ghi chú ${chip}`}
                        style={styles.noteChip}
                      >
                        <AppText style={styles.noteChipText}>+ {chip}</AppText>
                      </Pressable>
                    ))}
                  </View>

                  <TextInput
                    value={note}
                    onChangeText={(text) => {
                      setNote(text);
                      if (noteError) setNoteError(null);
                    }}
                    placeholder="Ví dụ: da nhạy cảm, tránh tinh dầu mạnh; tôi sẽ đến trễ vài phút."
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={NOTE_MAX}
                    accessibilityLabel="Ghi chú cho kỹ thuật viên"
                    style={styles.noteInput}
                  />
                  <View style={styles.noteFooterRow}>
                    {noteError ? (
                      <AppText style={styles.fieldErrorText}>{noteError}</AppText>
                    ) : (
                      <View />
                    )}
                    <AppText style={styles.counterText}>
                      {note.length}/{NOTE_MAX}
                    </AppText>
                  </View>
                </View>

                {/* Summary Card */}
                <BookingSummaryCard
                  isBookNowFlow={isBookNowFlow}
                  serviceName={serviceDisplayName}
                  selectedDate={selectedDate}
                  selectedStartTime={validSlot?.startTime}
                  selectedEndTime={selectedEndTime}
                  selectedStaffName={selectedStaffName}
                  price={price}
                />
              </>
            )}
          </ScrollView>

          {/* Sticky Bottom Bar */}
          {sourceData.canBook && (
            <View
              style={[styles.bottomBar, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}
            >
              <View style={styles.bottomTotalInfo}>
                <AppText style={styles.bottomTotalValue} numberOfLines={1}>
                  {isBookNowFlow ? formatCurrency(price) : '0 ₫'}
                </AppText>
              </View>
              <View style={styles.bottomActionWrap}>
                <AppButton
                  title={
                    isSubmitting
                      ? 'Đang xử lý...'
                      : isBookNowFlow
                        ? 'Tiếp tục thanh toán'
                        : 'Xác nhận đặt lịch'
                  }
                  onPress={() => void handleSubmit()}
                  disabled={!validSlot || isSubmitting}
                />
              </View>
            </View>
          )}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 0,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  centerAction: {
    width: '100%',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  ineligibleBox: {
    gap: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  noteChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  noteChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  noteChipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 80,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  noteFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldErrorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  counterText: {
    fontSize: 11,
    color: colors.muted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomTotalInfo: {
    flexShrink: 0,
    gap: 2,
  },
  bottomTotalLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  bottomTotalValue: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.primary,
  },
  bottomActionWrap: {
    flex: 1,
    maxWidth: 215,
  },
});
