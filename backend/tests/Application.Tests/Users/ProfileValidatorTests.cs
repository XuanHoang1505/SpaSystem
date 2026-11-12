using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Validators.Users;
using NhuNguyetSpa.Domain.Enums;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Users;

/// <summary>BR-AUTH-15 (personal fields) and BR-AUTH-16 (change password) field rules.</summary>
public sealed class ProfileValidatorTests
{
    /// <summary>17:30 UTC on 31/10 is already 00:30 on 01/11 in Vietnam.</summary>
    private static readonly DateTime Now = new(2026, 10, 31, 17, 30, 0, DateTimeKind.Utc);
    private static readonly DateOnly VietnamToday = new(2026, 11, 1);

    private readonly UpdateProfileRequestValidator _profile;
    private readonly ChangePasswordRequestValidator _password = new(Options.Create(new AccountOptions { PasswordMinLength = 8 }));

    public ProfileValidatorTests()
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        _profile = new UpdateProfileRequestValidator(clock);
    }

    private static UpdateProfileRequest Valid() => new("Nguyễn Thị An", "0912345678", new DateOnly(1995, 5, 20), Gender.Female);

    [Fact]
    public void ValidProfilePasses() => _profile.Validate(Valid()).IsValid.Should().BeTrue();

    [Fact]
    public void OptionalFieldsMayBeNull() => _profile.Validate(Valid() with { DateOfBirth = null, Gender = null }).IsValid.Should().BeTrue();

    [Fact]
    public void BirthDateOnVietnamTodayPasses() => _profile.Validate(Valid() with { DateOfBirth = VietnamToday }).IsValid.Should().BeTrue();

    public static TheoryData<UpdateProfileRequest, string> InvalidProfiles => new()
    {
        { Valid() with { FullName = "" }, nameof(UpdateProfileRequest.FullName) },
        { Valid() with { FullName = new string('a', 101) }, nameof(UpdateProfileRequest.FullName) },
        { Valid() with { PhoneNumber = "12345" }, nameof(UpdateProfileRequest.PhoneNumber) },
        { Valid() with { DateOfBirth = VietnamToday.AddDays(1) }, nameof(UpdateProfileRequest.DateOfBirth) },
        { Valid() with { DateOfBirth = new DateOnly(1899, 12, 31) }, nameof(UpdateProfileRequest.DateOfBirth) },
        { Valid() with { Gender = (Gender)99 }, nameof(UpdateProfileRequest.Gender) },
    };

    [Theory]
    [MemberData(nameof(InvalidProfiles))]
    public void InvalidProfileFailsOnField(UpdateProfileRequest request, string field) =>
        _profile.Validate(request).Errors.Should().ContainSingle().Which.PropertyName.Should().Be(field);

    [Fact]
    public void ValidPasswordChangePasses() =>
        _password.Validate(new ChangePasswordRequest("matkhau123", "matkhau456", "matkhau456")).IsValid.Should().BeTrue();

    [Theory]
    [InlineData("", "matkhau456", "matkhau456", nameof(ChangePasswordRequest.CurrentPassword))]
    [InlineData("matkhau123", "abcdefgh", "abcdefgh", nameof(ChangePasswordRequest.NewPassword))]
    [InlineData("matkhau123", "matkh45", "matkh45", nameof(ChangePasswordRequest.NewPassword))]
    [InlineData("matkhau123", "matkhau456", "matkhau789", nameof(ChangePasswordRequest.ConfirmPassword))]
    public void InvalidPasswordChangeFailsOnField(string current, string next, string confirm, string field) =>
        _password.Validate(new ChangePasswordRequest(current, next, confirm)).Errors.Should().Contain(error => error.PropertyName == field);

    [Fact]
    public void NewPasswordEqualToCurrentIsUnchanged()
    {
        var error = _password.Validate(new ChangePasswordRequest("matkhau123", "matkhau123", "matkhau123")).Errors.Should().ContainSingle().Which;

        error.PropertyName.Should().Be(nameof(ChangePasswordRequest.NewPassword));
        error.ErrorCode.Should().Be("password_unchanged");
        error.ErrorMessage.Should().Be("Mật khẩu mới phải khác mật khẩu hiện tại.");
    }
}
