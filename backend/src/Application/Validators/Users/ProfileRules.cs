using FluentValidation;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Users;

/// <summary>BR-AUTH-15: personal fields shared by <c>PUT /me</c> and <c>PUT /users/{id}</c>. Name and phone match BR-AUTH-10.</summary>
public static class ProfileRules
{
    public const int MaxFullNameLength = 100;
    public static readonly DateOnly EarliestDateOfBirth = new(1900, 1, 1);

    public static IRuleBuilderOptions<T, string> ProfileFullName<T>(this IRuleBuilder<T, string> rule) => rule
        .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage("Vui lòng nhập họ tên.")
        .MaximumLength(MaxFullNameLength).WithMessage($"Họ tên tối đa {MaxFullNameLength} ký tự.");

    public static IRuleBuilderOptions<T, string> ProfilePhoneNumber<T>(this IRuleBuilder<T, string> rule) => rule
        .Matches(@"^0\d{9}$").WithMessage("Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.");

    public static IRuleBuilderOptions<T, DateOnly?> DateOfBirth<T>(this IRuleBuilder<T, DateOnly?> rule, DateOnly today) => rule
        .Must(date => date is null || (date >= EarliestDateOfBirth && date <= today))
        .WithMessage($"Ngày sinh phải từ {EarliestDateOfBirth:dd/MM/yyyy} đến hôm nay.");

    public static IRuleBuilderOptions<T, Gender?> ProfileGender<T>(this IRuleBuilder<T, Gender?> rule) => rule
        .IsInEnum().WithMessage("Giới tính không hợp lệ.");
}
