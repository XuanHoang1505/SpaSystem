using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>Error codes of availability, UC-SPA-15 and UC-SPA-17 (docs/specs/bookings.md). <c>slot_unavailable</c> is also raised by the database constraint.</summary>
public static class BookingErrors
{
    public const string AppointmentNotFoundCode = "appointment_not_found";
    public const string AppointmentNotAssignedCode = "appointment_not_assigned";
    public const string SlotUnavailableCode = "slot_unavailable";
    public const string CustomerBusyCode = "customer_busy";
    public const string OutsideWorkScheduleCode = "outside_work_schedule";
    public const string StaffNotQualifiedCode = "staff_not_qualified";
    public const string StaffNotOnShiftCode = "staff_not_on_shift";
    public const string StaffBusyCode = "staff_busy";
    public const string AppointmentStatusInvalidCode = "appointment_status_invalid";
    public const string AppointmentInPastCode = "appointment_in_past";
    public const string NoShowTooEarlyCode = "no_show_too_early";
    public const string SlotTooSoonCode = "slot_too_soon";
    public const string SessionTooEarlyCode = "session_too_early";
    public const string EntitlementNotEligibleCode = "entitlement_not_eligible";
    public const string EntitlementNotFoundCode = "entitlement_not_found";
    public const string TreatmentSessionNotFoundCode = "treatment_session_not_found";

    public static NotFoundException AppointmentNotFound() => new("Không tìm thấy lịch hẹn.", AppointmentNotFoundCode);

    public static ForbiddenException NotAssigned() => new("Bạn không được phân công lịch hẹn này.", AppointmentNotAssignedCode);

    public static ConflictException SlotUnavailable() =>
        new("Khung giờ này vừa có người đặt, vui lòng chọn giờ khác.", SlotUnavailableCode);

    public static ConflictException CustomerBusy() => new("Khách đã có lịch hẹn khác trùng khung giờ này.", CustomerBusyCode);

    public static ConflictException OutsideWorkSchedule() =>
        new("Khung giờ không nằm trọn trong ca làm của nhân viên.", OutsideWorkScheduleCode);

    public static BusinessRuleException StaffNotQualified() =>
        new("Nhân viên không thực hiện được dịch vụ của lịch hẹn.", StaffNotQualifiedCode);

    public static ConflictException StaffNotOnShift() =>
        new("Nhân viên không có ca làm phủ khung giờ của lịch hẹn.", StaffNotOnShiftCode);

    public static ConflictException StaffBusy() => new("Nhân viên đã có lịch hẹn khác trong khung giờ này.", StaffBusyCode);

    public static ConflictException StatusInvalid(AppointmentStatus current) =>
        new($"Không thể thực hiện thao tác khi lịch hẹn ở trạng thái {Label(current)}.", AppointmentStatusInvalidCode);

    public static BusinessRuleException InPast() => new("Lịch hẹn đã bắt đầu hoặc thời gian mới đã qua.", AppointmentInPastCode);

    public static BusinessRuleException NoShowTooEarly() =>
        new("Chỉ ghi nhận khách không đến sau giờ bắt đầu lịch hẹn.", NoShowTooEarlyCode);

    /// <summary>BR-BKG-15: a book-now slot must not start while the hold is still waiting for payment.</summary>
    public static BusinessRuleException SlotTooSoon() =>
        new("Khung giờ quá gần, vui lòng chọn giờ bắt đầu sau khi hết thời gian giữ chỗ.", SlotTooSoonCode);

    public static BusinessRuleException SessionTooEarly(DateOnly earliest) =>
        new($"Buổi này chỉ đặt được từ ngày {earliest:dd/MM/yyyy}.", SessionTooEarlyCode);

    /// <summary>The bought service or session cannot be booked; <paramref name="reason"/> is shown to the customer.</summary>
    public static ConflictException EntitlementNotEligible(string reason) => new(reason, EntitlementNotEligibleCode);

    public static NotFoundException EntitlementNotFound() => new("Không tìm thấy dịch vụ đã mua.", EntitlementNotFoundCode);

    public static NotFoundException TreatmentSessionNotFound() => new("Không tìm thấy buổi chăm sóc.", TreatmentSessionNotFoundCode);

    private static string Label(AppointmentStatus status) => status switch
    {
        AppointmentStatus.Held => "Giữ chỗ",
        AppointmentStatus.PendingConfirmation => "Chờ xác nhận",
        AppointmentStatus.Confirmed => "Đã xác nhận",
        AppointmentStatus.Completed => "Hoàn thành",
        AppointmentStatus.Cancelled => "Đã hủy",
        AppointmentStatus.NoShow => "Không đến",
        AppointmentStatus.HoldExpired => "Hết hạn giữ chỗ",
        _ => status.ToString(),
    };
}
