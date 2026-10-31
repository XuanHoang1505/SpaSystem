using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Care;

/// <summary>Error codes of UC-SPA-27 and UC-SPA-28 (docs/specs/care.md). <c>skin_profile_exists</c> is also raised by the unique index.</summary>
public static class CareErrors
{
    public const string SkinProfileNotFoundCode = "skin_profile_not_found";
    public const string SkinProfileExistsCode = "skin_profile_exists";
    public const string SkinProfileTooEarlyCode = "skin_profile_too_early";
    public const string SkinProfileLockedCode = "skin_profile_locked";
    public const string SkinProfileRequiredCode = "skin_profile_required";
    public const string CustomerNotFoundCode = "customer_not_found";
    public const string CustomerNotInCareCode = "customer_not_in_care";
    public const string AllergyNotFoundCode = "allergy_not_found";
    public const string AllergyExistsCode = "allergy_exists";
    public const string CompleteTooEarlyCode = "complete_too_early";
    public const string EntitlementStateInvalidCode = "entitlement_state_invalid";

    public const string SkinProfileExistsMessage = "Lịch hẹn này đã có hồ sơ da.";

    public static NotFoundException SkinProfileNotFound() => new("Không tìm thấy hồ sơ da.", SkinProfileNotFoundCode);

    public static ConflictException SkinProfileExists() => new(SkinProfileExistsMessage, SkinProfileExistsCode);

    public static BusinessRuleException SkinProfileTooEarly() => new("Chỉ lập hồ sơ da từ ngày hẹn.", SkinProfileTooEarlyCode);

    public static ConflictException SkinProfileLocked(int days) =>
        new($"Hồ sơ da chỉ sửa được trong {days} ngày sau buổi chăm sóc.", SkinProfileLockedCode);

    public static ConflictException SkinProfileRequired() =>
        new("Cần lập hồ sơ da trước khi xác nhận hoàn thành.", SkinProfileRequiredCode);

    public static NotFoundException CustomerNotFound() => new("Không tìm thấy khách hàng.", CustomerNotFoundCode);

    public static ForbiddenException CustomerNotInCare() =>
        new("Bạn chưa được phân công chăm sóc khách hàng này.", CustomerNotInCareCode);

    public static NotFoundException AllergyNotFound() => new("Không tìm thấy thông tin dị ứng.", AllergyNotFoundCode);

    public static ConflictException AllergyExists() => new("Khách đã có thông tin dị ứng với tác nhân này.", AllergyExistsCode);

    public static BusinessRuleException CompleteTooEarly() =>
        new("Chỉ xác nhận hoàn thành sau giờ bắt đầu lịch hẹn.", CompleteTooEarlyCode);

    /// <summary>The entitlement, session, package or plan behind the appointment no longer allows completion; <paramref name="reason"/> is shown.</summary>
    public static ConflictException EntitlementStateInvalid(string reason) => new(reason, EntitlementStateInvalidCode);
}
