using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Treatments;

/// <summary>Error codes of UC-SPA-19 and UC-SPA-21 (docs/specs/purchases-treatments.md).</summary>
public static class TreatmentErrors
{
    public const string TreatmentPlanNotFoundCode = "treatment_plan_not_found";
    public const string TreatmentNotInChargeCode = "treatment_not_in_charge";
    public const string TreatmentStatusInvalidCode = "treatment_status_invalid";
    public const string TreatmentHasBookedSessionsCode = "treatment_has_booked_sessions";
    public const string TreatmentSessionsRemainingCode = "treatment_sessions_remaining";
    public const string TreatmentSessionCompletedCode = "treatment_session_completed";
    public const string StaffResignedCode = "staff_resigned";
    public const string ForbiddenCode = "forbidden";

    public static NotFoundException TreatmentPlanNotFound() => new("Không tìm thấy liệu trình.", TreatmentPlanNotFoundCode);

    public static ForbiddenException TreatmentNotInCharge() => new("Bạn không phụ trách liệu trình này.", TreatmentNotInChargeCode);

    public static ConflictException StatusInvalid(TreatmentPlanStatus status) =>
        new($"Liệu trình đang ở trạng thái {TreatmentStatusText.ToVietnamese(status)}, không thể thực hiện thao tác này.", TreatmentStatusInvalidCode);

    public static ConflictException HasBookedSessions() =>
        new("Liệu trình còn buổi đã đặt lịch. Hãy hủy các lịch hẹn đó trước.", TreatmentHasBookedSessionsCode);

    public static ConflictException SessionsRemaining() =>
        new("Liệu trình còn buổi chưa thực hiện, chưa thể đóng.", TreatmentSessionsRemainingCode);

    public static ConflictException SessionCompleted() =>
        new("Buổi đã hoàn thành, chỉ chủ spa được sửa ghi chú.", TreatmentSessionCompletedCode);

    public static BusinessRuleException StaffResigned() =>
        new("Nhân viên đã nghỉ việc, không thể phụ trách liệu trình.", StaffResignedCode);

    public static ForbiddenException OwnerOnly() => new("Chỉ chủ spa được thực hiện thao tác này.", ForbiddenCode);
}
