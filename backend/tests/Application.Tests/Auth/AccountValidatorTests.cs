using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Validators.Auth;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Auth;

/// <summary>BR-AUTH-10 (docs/specs/auth.md).</summary>
public sealed class AccountValidatorTests
{
    private static readonly IOptions<AccountOptions> Options = Microsoft.Extensions.Options.Options.Create(new AccountOptions());
    private static readonly RegisterRequest Valid = new("Nguyễn Thị An", "an@gmail.com", "0912345678", "matkhau123", "matkhau123");

    [Fact]
    public void ValidRegisterRequestPasses() =>
        new RegisterRequestValidator(Options).Validate(Valid).IsValid.Should().BeTrue();

    [Theory]
    [InlineData("abcdefgh")]
    [InlineData("12345678")]
    [InlineData("abc1234")]
    [InlineData("")]
    public void RegisterValidatorRejectsWeakPasswords(string password)
    {
        var result = new RegisterRequestValidator(Options).Validate(Valid with { Password = password, ConfirmPassword = password });

        result.Errors.Should().Contain(error => error.PropertyName == nameof(RegisterRequest.Password));
    }

    [Fact]
    public void RegisterValidatorRejectsMismatchedConfirm()
    {
        var result = new RegisterRequestValidator(Options).Validate(Valid with { ConfirmPassword = "matkhau124" });

        result.Errors.Should().Contain(error => error.PropertyName == nameof(RegisterRequest.ConfirmPassword));
    }

    [Theory]
    [InlineData("+84912345678")]
    [InlineData("091234567")]
    [InlineData("09123456789")]
    [InlineData("1912345678")]
    public void RegisterValidatorRejectsBadPhone(string phone) =>
        new RegisterRequestValidator(Options).Validate(Valid with { PhoneNumber = phone }).Errors
            .Should().Contain(error => error.PropertyName == nameof(RegisterRequest.PhoneNumber));

    [Theory]
    [InlineData("", "FullName")]
    [InlineData("khong-phai-email", "Email")]
    [InlineData("an nguyen@gmail.com", "Email")]
    [InlineData("an@gmail", "Email")]
    [InlineData("an@@gmail.com", "Email")]
    public void RegisterValidatorRequiresNameAndEmail(string value, string field)
    {
        var request = field == "FullName" ? Valid with { FullName = value } : Valid with { Email = value };

        new RegisterRequestValidator(Options).Validate(request).Errors.Should().Contain(error => error.PropertyName == field);
    }

    [Fact]
    public void PasswordMinLengthComesFromOptions()
    {
        var strict = Microsoft.Extensions.Options.Options.Create(new AccountOptions { PasswordMinLength = 12 });

        new RegisterRequestValidator(strict).Validate(Valid).IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("12a456")]
    [InlineData("1234567")]
    public void VerifyOtpValidatorRequiresSixDigits(string otp) =>
        new VerifyOtpRequestValidator().Validate(new VerifyOtpRequest("an@gmail.com", otp)).Errors
            .Should().Contain(error => error.PropertyName == nameof(VerifyOtpRequest.Otp));

    [Fact]
    public void VerifyOtpValidatorAcceptsLeadingZeros() =>
        new VerifyOtpRequestValidator().Validate(new VerifyOtpRequest("an@gmail.com", "012345")).IsValid.Should().BeTrue();

    [Fact]
    public void ForgotPasswordRequiresValidEmail() =>
        new ForgotPasswordRequestValidator().Validate(new ForgotPasswordRequest("abc")).IsValid.Should().BeFalse();

    [Fact]
    public void ResetPasswordAppliesPasswordRules()
    {
        var validator = new ResetPasswordRequestValidator(Options);

        validator.Validate(new ResetPasswordRequest("token", "matkhau123", "matkhau123")).IsValid.Should().BeTrue();
        validator.Validate(new ResetPasswordRequest("token", "abcdefgh", "abcdefgh")).IsValid.Should().BeFalse();
        validator.Validate(new ResetPasswordRequest("token", "matkhau123", "khac12345")).IsValid.Should().BeFalse();
        validator.Validate(new ResetPasswordRequest("", "matkhau123", "matkhau123")).IsValid.Should().BeFalse();
    }
}
