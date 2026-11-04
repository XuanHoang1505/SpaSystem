using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Validators.Users;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Users;

/// <summary><c>GET /users</c> filters and <c>PATCH /users/{id}/status</c> body (BR-AUTH-18).</summary>
public sealed class UserAccountValidatorTests
{
    private readonly UserFilterValidator _filter = new();
    private readonly ChangeUserStatusRequestValidator _status = new();

    [Theory]
    [InlineData(null, null)]
    [InlineData("customer", "active")]
    [InlineData("Staff", "LOCKED")]
    [InlineData("owner", "inactive")]
    public void KnownFiltersPass(string? role, string? status) =>
        _filter.Validate(new UserFilter { Role = role, Status = status }).IsValid.Should().BeTrue();

    [Theory]
    [InlineData("x", null, nameof(UserFilter.Role))]
    [InlineData(null, "deleted", nameof(UserFilter.Status))]
    [InlineData("1", null, nameof(UserFilter.Role))]
    public void UnknownFiltersFail(string? role, string? status, string field) =>
        _filter.Validate(new UserFilter { Role = role, Status = status }).Errors.Should().ContainSingle().Which.PropertyName.Should().Be(field);

    [Theory]
    [InlineData(UserStatus.Active)]
    [InlineData(UserStatus.Locked)]
    public void ActiveOrLockedPasses(UserStatus status) => _status.Validate(new ChangeUserStatusRequest(status)).IsValid.Should().BeTrue();

    [Fact]
    public void MissingStatusFails() =>
        _status.Validate(new ChangeUserStatusRequest(null)).Errors.Should().ContainSingle().Which.ErrorMessage.Should().Be("Vui lòng chọn trạng thái.");

    [Fact]
    public void InactiveIsNotAllowed() =>
        _status.Validate(new ChangeUserStatusRequest(UserStatus.Inactive)).Errors.Should().ContainSingle()
            .Which.ErrorMessage.Should().Be("Chỉ được khóa hoặc mở khóa tài khoản.");
}
