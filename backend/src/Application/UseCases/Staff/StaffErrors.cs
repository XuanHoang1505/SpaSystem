using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Staff;

/// <summary>Error codes of UC-SPA-22 (docs/specs/staff.md). Email/phone conflicts reuse <c>AccountErrors</c>.</summary>
public static class StaffErrors
{
    public const string StaffNotFoundCode = "staff_not_found";
    public const string StaffServiceNotFoundCode = "staff_service_not_found";
    public const string StaffServiceDiscontinuedCode = "staff_service_discontinued";
    public const string StaffAlreadyResignedCode = "staff_already_resigned";
    public const string ResignationBeforeHireDateCode = "resignation_before_hire_date";
    public const string HireDateAfterShiftCode = "hire_date_after_shift";

    public static NotFoundException StaffNotFound() => new("Không tìm thấy nhân viên.", StaffNotFoundCode);

    public static BusinessRuleException StaffServiceNotFound() =>
        new("Có dịch vụ trong danh sách không tồn tại.", StaffServiceNotFoundCode);

    public static BusinessRuleException StaffServiceDiscontinued(string serviceName) =>
        new($"Dịch vụ \"{serviceName}\" đang ngừng bán, không thể giao cho nhân viên.", StaffServiceDiscontinuedCode);

    public static ConflictException StaffAlreadyResigned() =>
        new("Nhân viên này đã được ghi nhận nghỉ việc.", StaffAlreadyResignedCode);

    public static BusinessRuleException ResignationBeforeHireDate() =>
        new("Ngày nghỉ việc không được trước ngày vào làm.", ResignationBeforeHireDateCode);

    public static BusinessRuleException HireDateAfterShift(DateOnly earliestShift) =>
        new($"Nhân viên đã có ca làm ngày {earliestShift:dd/MM/yyyy}, ngày vào làm không được sau ngày đó.", HireDateAfterShiftCode);
}
