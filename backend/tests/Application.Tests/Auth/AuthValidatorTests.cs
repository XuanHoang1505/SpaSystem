using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Validators.Auth;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Auth;

public sealed class AuthValidatorTests
{
    [Theory]
    [InlineData("", "Spa@12345", "Login")]
    [InlineData("owner@spa.vn", "", "Password")]
    [InlineData("owner@spa.vn", null, "Password")]
    public void LoginRequestRequiresLoginAndPassword(string login, string? password, string field)
    {
        var result = new LoginRequestValidator().Validate(new LoginRequest(login, password!));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(error => error.PropertyName == field);
    }

    [Fact]
    public void LoginRequestRejectsOverlongValues()
    {
        var validator = new LoginRequestValidator();

        validator.Validate(new LoginRequest(new string('a', 256), "Spa@12345")).IsValid.Should().BeFalse();
        validator.Validate(new LoginRequest("owner@spa.vn", new string('a', 129))).IsValid.Should().BeFalse();
        validator.Validate(new LoginRequest("owner@spa.vn", new string('a', 128))).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void RefreshTokenRequestRequiresToken(string? token) =>
        new RefreshTokenRequestValidator().Validate(new RefreshTokenRequest(token!)).IsValid.Should().BeFalse();

    [Fact]
    public void RefreshTokenRequestRejectsOverlongToken() =>
        new RefreshTokenRequestValidator().Validate(new RefreshTokenRequest(new string('a', 201))).IsValid.Should().BeFalse();
}
