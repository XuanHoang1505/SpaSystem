using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Staff;

/// <summary>Error codes of staff certifications (docs/specs/staff.md, UC-SPA-22 bổ sung).</summary>
public static class StaffCertificationErrors
{
    public const string NotFoundCode = "staff_certification_not_found";
    public const string LimitCode = "staff_certification_limit";
    public const string VerifiedCode = "staff_certification_verified";
    public const string StatusInvalidCode = "staff_certification_status_invalid";

    public static NotFoundException NotFound() => new("Không tìm thấy bằng cấp, chứng chỉ.", NotFoundCode);

    public static ConflictException Limit(int max) =>
        new($"Mỗi nhân viên ghi nhận tối đa {max} bằng cấp, chứng chỉ.", LimitCode);

    public static ConflictException Verified() =>
        new("Bằng này đã được chủ spa duyệt. Vui lòng liên hệ chủ spa nếu cần xóa.", VerifiedCode);

    public static ConflictException StatusInvalid(string current) =>
        new($"Bằng này đang ở trạng thái {current}, không đổi được như vậy.", StatusInvalidCode);
}
