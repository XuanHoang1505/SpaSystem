using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.WorkSchedules;

/// <summary>Error codes of UC-SPA-23 (docs/specs/staff.md). <c>shift_conflict</c> is also raised by the database constraint.</summary>
public static class WorkScheduleErrors
{
    public const string WorkScheduleNotFoundCode = "work_schedule_not_found";
    public const string ShiftConflictCode = "shift_conflict";
    public const string ShiftHasAppointmentsCode = "shift_has_appointments";
    public const string ShiftDateOutOfRangeCode = "shift_date_out_of_range";
    public const string ShiftInPastCode = "shift_in_past";
    public const string ShiftBeforeHireDateCode = "shift_before_hire_date";
    public const string StaffResignedCode = "staff_resigned";
    public const string ShiftCancelledCode = "shift_cancelled";

    public static NotFoundException WorkScheduleNotFound() => new("Không tìm thấy ca làm.", WorkScheduleNotFoundCode);

    public static ConflictException ShiftConflict() =>
        new("Ca làm bị chồng với một ca khác của nhân viên trong ngày.", ShiftConflictCode);

    public static ConflictException ShiftHasAppointments(int count) =>
        new($"Ca này đang có {count} lịch hẹn, hãy đổi lịch hẹn trước khi sửa hoặc hủy ca.", ShiftHasAppointmentsCode);

    public static BusinessRuleException ShiftDateOutOfRange(int maxDaysAhead) =>
        new($"Chỉ phân ca từ hôm nay đến {maxDaysAhead} ngày tới.", ShiftDateOutOfRangeCode);

    public static BusinessRuleException ShiftInPast() => new("Không sửa hoặc hủy ca của ngày đã qua.", ShiftInPastCode);

    public static BusinessRuleException ShiftBeforeHireDate() =>
        new("Không phân ca trước ngày vào làm của nhân viên.", ShiftBeforeHireDateCode);

    public static BusinessRuleException StaffResigned() =>
        new("Nhân viên đã nghỉ việc từ ngày này, không thể phân ca.", StaffResignedCode);

    public static ConflictException ShiftCancelled() => new("Ca này đã hủy, không thể sửa. Hãy thêm ca mới.", ShiftCancelledCode);
}
