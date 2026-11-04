using FluentAssertions;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Auth;
using NhuNguyetSpa.Application.Validators.Auth;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Auth;

public sealed class AuthServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 25, 0, 0, 0, DateTimeKind.Utc);
    private const string Password = "Spa@12345";

    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();
    private readonly ITokenService _tokens = Substitute.For<ITokenService>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly AuthService _service;
    private readonly User _owner = new() { FullName = "Chủ spa", Email = "owner@spa.vn", PhoneNumber = "0900000000", PasswordHash = "hash", Role = UserRole.Owner, Status = UserStatus.Active };

    public AuthServiceTests()
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        _hasher.DummyHash.Returns("dummy-hash");
        _hasher.Verify("hash", Password).Returns(true);
        _tokens.CreateAccessToken(Arg.Any<User>(), Now).Returns(new AccessToken("access", Now.AddMinutes(15)));
        _tokens.CreateRefreshToken(Now).Returns(new IssuedRefreshToken("new-refresh", "new-hash", Now.AddDays(7)));
        _tokens.HashRefreshToken(Arg.Any<string>()).Returns(call => "hash-of-" + call.Arg<string>());
        _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<CancellationToken, Task>>()(CancellationToken.None));
        _service = new AuthService(_users, _refreshTokens, _hasher, _tokens, _unitOfWork, clock,
            new LoginRequestValidator(), new RefreshTokenRequestValidator());
    }

    [Fact]
    public async Task LoginReturnsTokensAndStoresRefreshTokenHash()
    {
        _users.FindByLoginAsync("owner@spa.vn", Arg.Any<CancellationToken>()).Returns(_owner);

        var result = await _service.LoginAsync(new LoginRequest("owner@spa.vn", Password), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.AccessToken.Should().Be("access");
        result.Data.AccessTokenExpiresAtUtc.Should().Be(Now.AddMinutes(15));
        result.Data.RefreshToken.Should().Be("new-refresh");
        result.Data.RefreshTokenExpiresAtUtc.Should().Be(Now.AddDays(7));
        result.Data.User.Should().Be(new AuthUserDto(_owner.Id, "Chủ spa", "owner@spa.vn", UserRole.Owner));
        await _refreshTokens.Received(1).AddAsync(Arg.Is<RefreshToken>(token =>
            token.UserId == _owner.Id && token.TokenHash == "new-hash" && token.ExpiresAtUtc == Now.AddDays(7)), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoginTrimsAndMatchesEmailCaseInsensitively()
    {
        _users.FindByLoginAsync("Owner@Spa.VN", Arg.Any<CancellationToken>()).Returns(_owner);

        var result = await _service.LoginAsync(new LoginRequest("  Owner@Spa.VN ", Password), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        await _users.Received(1).FindByLoginAsync("Owner@Spa.VN", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoginWithWrongPasswordAndUnknownUserFailIdentically()
    {
        _users.FindByLoginAsync("owner@spa.vn", Arg.Any<CancellationToken>()).Returns(_owner);

        var wrongPassword = await Capture(() => _service.LoginAsync(new LoginRequest("owner@spa.vn", "wrong"), CancellationToken.None));
        var unknownUser = await Capture(() => _service.LoginAsync(new LoginRequest("nobody@spa.vn", Password), CancellationToken.None));

        wrongPassword.Should().BeOfType<UnauthorizedException>().Which.Code.Should().Be("invalid_credentials");
        unknownUser.Should().BeOfType<UnauthorizedException>().Which.Code.Should().Be("invalid_credentials");
        unknownUser.Message.Should().Be(wrongPassword.Message).And.Be("Email/số điện thoại hoặc mật khẩu không đúng.");
        _hasher.Received(1).Verify("dummy-hash", Password);
        _tokens.DidNotReceiveWithAnyArgs().CreateAccessToken(default!, default);
    }

    [Theory]
    [InlineData(UserStatus.Locked, "account_locked")]
    [InlineData(UserStatus.Inactive, "account_inactive")]
    public async Task LoginRejectsNonActiveAccountsAfterPasswordCheck(UserStatus status, string code)
    {
        _owner.Status = status;
        _users.FindByLoginAsync("owner@spa.vn", Arg.Any<CancellationToken>()).Returns(_owner);

        var exception = await Capture(() => _service.LoginAsync(new LoginRequest("owner@spa.vn", Password), CancellationToken.None));

        exception.Should().BeOfType<ForbiddenException>().Which.Code.Should().Be(code);
        _tokens.DidNotReceiveWithAnyArgs().CreateAccessToken(default!, default);
        await _refreshTokens.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task RefreshRotatesToken()
    {
        var stored = StoredToken("old");
        _refreshTokens.TryRevokeAsync(stored.Id, Now, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _service.RefreshAsync(new RefreshTokenRequest("old"), CancellationToken.None);

        result.Data!.RefreshToken.Should().Be("new-refresh");
        await _refreshTokens.Received(1).TryRevokeAsync(stored.Id, Now, Arg.Any<CancellationToken>());
        await _refreshTokens.Received(1).AddAsync(Arg.Is<RefreshToken>(token => token.TokenHash == "new-hash"), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RefreshWithRevokedTokenRevokesAllAndFails()
    {
        var stored = StoredToken("old");
        stored.RevokedAtUtc = Now.AddMinutes(-1);

        var exception = await Capture(() => _service.RefreshAsync(new RefreshTokenRequest("old"), CancellationToken.None));

        exception.Should().BeOfType<UnauthorizedException>().Which.Code.Should().Be("invalid_refresh_token");
        await _refreshTokens.Received(1).RevokeAllActiveAsync(_owner.Id, Now, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _refreshTokens.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task RefreshWithExpiredTokenFails()
    {
        StoredToken("old").ExpiresAtUtc = Now;

        var exception = await Capture(() => _service.RefreshAsync(new RefreshTokenRequest("old"), CancellationToken.None));

        exception.Should().BeOfType<UnauthorizedException>().Which.Code.Should().Be("invalid_refresh_token");
        await _refreshTokens.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task RefreshWithUnknownTokenFails()
    {
        var exception = await Capture(() => _service.RefreshAsync(new RefreshTokenRequest("unknown"), CancellationToken.None));

        exception.Should().BeOfType<UnauthorizedException>().Which.Code.Should().Be("invalid_refresh_token");
    }

    [Fact]
    public async Task RefreshForLockedUserRevokesAndFails()
    {
        var stored = StoredToken("old");
        _owner.Status = UserStatus.Locked;

        var exception = await Capture(() => _service.RefreshAsync(new RefreshTokenRequest("old"), CancellationToken.None));

        exception.Should().BeOfType<ForbiddenException>().Which.Code.Should().Be("account_locked");
        await _refreshTokens.Received(1).TryRevokeAsync(stored.Id, Now, Arg.Any<CancellationToken>());
        _tokens.DidNotReceiveWithAnyArgs().CreateAccessToken(default!, default);
    }

    [Fact]
    public async Task RefreshLosingRaceFails()
    {
        var stored = StoredToken("old");
        _refreshTokens.TryRevokeAsync(stored.Id, Now, Arg.Any<CancellationToken>()).Returns(false);

        var exception = await Capture(() => _service.RefreshAsync(new RefreshTokenRequest("old"), CancellationToken.None));

        exception.Should().BeOfType<UnauthorizedException>().Which.Code.Should().Be("invalid_refresh_token");
        await _refreshTokens.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task LogoutRevokesOwnTokenOnly()
    {
        var own = StoredToken("own");
        var otherUsers = StoredToken("other", userId: Guid.NewGuid());

        await _service.LogoutAsync(new RefreshTokenRequest("own"), _owner.Id, CancellationToken.None);
        await _service.LogoutAsync(new RefreshTokenRequest("other"), _owner.Id, CancellationToken.None);
        await _service.LogoutAsync(new RefreshTokenRequest("unknown"), _owner.Id, CancellationToken.None);

        await _refreshTokens.Received(1).TryRevokeAsync(own.Id, Now, Arg.Any<CancellationToken>());
        await _refreshTokens.DidNotReceive().TryRevokeAsync(otherUsers.Id, Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoginRejectsStaffFromResignationDate()
    {
        var staff = Staff();
        _users.FindByLoginAsync("staff@spa.vn", Arg.Any<CancellationToken>()).Returns(staff);
        _users.IsResignedStaffAsync(staff.Id, new DateOnly(2026, 10, 25), Arg.Any<CancellationToken>()).Returns(true);

        var exception = await Capture(() => _service.LoginAsync(new LoginRequest("staff@spa.vn", Password), CancellationToken.None));

        exception.Should().BeOfType<ForbiddenException>().Which.Code.Should().Be("account_inactive");
        _tokens.DidNotReceiveWithAnyArgs().CreateAccessToken(default!, default);
    }

    [Fact]
    public async Task LoginAllowsStaffBeforeResignationDate()
    {
        var staff = Staff();
        _users.FindByLoginAsync("staff@spa.vn", Arg.Any<CancellationToken>()).Returns(staff);

        var result = await _service.LoginAsync(new LoginRequest("staff@spa.vn", Password), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        await _users.Received(1).IsResignedStaffAsync(staff.Id, new DateOnly(2026, 10, 25), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoginDoesNotQueryResignationForOtherRoles()
    {
        _users.FindByLoginAsync("owner@spa.vn", Arg.Any<CancellationToken>()).Returns(_owner);

        await _service.LoginAsync(new LoginRequest("owner@spa.vn", Password), CancellationToken.None);

        await _users.DidNotReceiveWithAnyArgs().IsResignedStaffAsync(default, default, default);
    }

    [Fact]
    public async Task RefreshRejectsResignedStaffAndRevokesToken()
    {
        var staff = Staff();
        var stored = StoredToken("old", staff.Id);
        stored.User = staff;
        _users.IsResignedStaffAsync(staff.Id, new DateOnly(2026, 10, 25), Arg.Any<CancellationToken>()).Returns(true);

        var exception = await Capture(() => _service.RefreshAsync(new RefreshTokenRequest("old"), CancellationToken.None));

        exception.Should().BeOfType<ForbiddenException>().Which.Code.Should().Be("account_inactive");
        await _refreshTokens.Received(1).TryRevokeAsync(stored.Id, Now, Arg.Any<CancellationToken>());
        _tokens.DidNotReceiveWithAnyArgs().CreateAccessToken(default!, default);
    }

    private static User Staff() => new()
    {
        FullName = "Nhân viên", Email = "staff@spa.vn", PhoneNumber = "0911111111", PasswordHash = "hash", Role = UserRole.Staff,
        Status = UserStatus.Active,
    };

    private RefreshToken StoredToken(string token, Guid? userId = null)
    {
        var stored = new RefreshToken
        {
            UserId = userId ?? _owner.Id,
            User = userId is null ? _owner : new User { Status = UserStatus.Active },
            TokenHash = "hash-of-" + token,
            ExpiresAtUtc = Now.AddDays(1),
            CreatedAtUtc = Now.AddDays(-6),
        };
        _refreshTokens.FindByHashAsync("hash-of-" + token, Arg.Any<CancellationToken>()).Returns(stored);
        return stored;
    }

    private static async Task<Exception> Capture(Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (Exception exception)
        {
            return exception;
        }
        throw new InvalidOperationException("Expected an exception.");
    }
}
