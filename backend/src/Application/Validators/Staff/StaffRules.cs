using FluentValidation;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;

namespace NhuNguyetSpa.Application.Validators.Staff;

/// <summary>BR-STF-04 field rules shared by the staff validators. Name, email and phone match registration (BR-AUTH-10).</summary>
public static class StaffRules
{
    public const int MaxSpecialtyLength = 255;
    public const int MaxServices = 100;
    public const int MaxDaysAhead = 365;
    public static readonly DateOnly EarliestHireDate = new(2000, 1, 1);

    public static IRuleBuilderOptions<T, string> StaffFullName<T>(this IRuleBuilder<T, string> rule) => rule
        .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage("Vui lòng nhập họ tên.")
        .MaximumLength(100);

    public static IRuleBuilderOptions<T, string> StaffPhoneNumber<T>(this IRuleBuilder<T, string> rule) => rule
        .Matches(@"^0\d{9}$").WithMessage("Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.");

    public static IRuleBuilderOptions<T, string?> StaffSpecialty<T>(this IRuleBuilder<T, string?> rule) => rule
        .MaximumLength(MaxSpecialtyLength).WithMessage($"Chuyên môn tối đa {MaxSpecialtyLength} ký tự.");

    public static IRuleBuilderOptions<T, DateOnly?> HireDate<T>(this IRuleBuilderInitial<T, DateOnly?> rule, DateOnly today) => rule
        .Cascade(CascadeMode.Stop)
        .NotNull().WithMessage("Vui lòng nhập ngày vào làm.")
        .Must(date => date >= EarliestHireDate && date <= today.AddDays(MaxDaysAhead))
        .WithMessage($"Ngày vào làm phải từ {EarliestHireDate:dd/MM/yyyy} đến {MaxDaysAhead} ngày tới.");

    public static IRuleBuilderOptions<T, IReadOnlyList<Guid>?> SpaServiceIds<T>(this IRuleBuilderInitial<T, IReadOnlyList<Guid>?> rule) => rule
        .Cascade(CascadeMode.Stop)
        .NotNull().WithMessage("Vui lòng gửi danh sách dịch vụ (có thể rỗng).")
        .Must(ids => ids!.Count <= MaxServices).WithMessage($"Tối đa {MaxServices} dịch vụ.")
        .Must(ids => ids!.Distinct().Count() == ids!.Count).WithMessage("Danh sách dịch vụ bị trùng.");

    public static DateOnly Today(this IDateTimeProvider clock) => SpaTime.Today(clock.UtcNow);
}
