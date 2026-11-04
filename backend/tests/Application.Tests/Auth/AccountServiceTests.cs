using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Auth;
using NhuNguyetSpa.Application.Validators.Auth;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Auth;

/// <summary>UC-SPA-01/03 rules (docs/specs/auth.md) with substituted ports and a fixed clock.</summary>
public sealed class AccountServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 25, 3, 0, 0, DateTimeKind.Utc);
    private const string Email = "an@gmail.com";
    private const string Password = "matkhau123";

    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IRepository<Customer> _customers = Substitute.For<IRepository<Customer>>();
    private readonly IOtpCodeRepository _otps = Substitute.For<IOtpCodeRepository>();
    private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();
    private readonly ITokenService _tokens = Substitute.For<ITokenService>();
    private readonly IEmailSender _mail = Substitute.For<IEmailSender>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly List<EmailMessage> _sent = [];
    private readonly AccountService _service;

    public AccountServiceTests()
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        _hasher.Hash(Arg.Any<string>()).Returns(call => "hashed:" + call.Arg<string>());
        _hasher.Verify(Arg.Any<string>(), Arg.Any<string>()).Returns(call => call.ArgAt<string>(0) == "hashed:" + call.ArgAt<string>(1));
        _tokens.ComputePasswordStamp(Arg.Any<string>()).Returns(call => "stamp:" + call.Arg<string>());
        _mail.SendAsync(Arg.Do<EmailMessage>(_sent.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<CancellationToken, Task>>()(CancellationToken.None));
        _otps.TryConsumeAsync(Arg.Any<Guid>(), Now, 5, Arg.Any<CancellationToken>()).Returns(true);
        var options = Options.Create(new AccountOptions());
        _service = new AccountService(_users, _customers, _otps, _refreshTokens, _hasher, _tokens, _mail, _unitOfWork, clock, options,
            new RegisterRequestValidator(options), new VerifyOtpRequestValidator(), new ForgotPasswordRequestValidator(),
            new ResetPasswordRequestValidator(options));
    }

    private static RegisterRequest Register => new(" Nguyễn Thị An ", " " + Email + " ", "0912345678", Password, Password);

    [Fact]
    public async Task RegisterRequestStoresHashedOtpAndPendingDataThenSendsMail()
    {
        OtpCode? stored = null;
        await _otps.AddAsync(Arg.Do<OtpCode>(otp => stored = otp), Arg.Any<CancellationToken>());

        var result = await _service.RequestRegistrationOtpAsync(Register, CancellationToken.None);

        result.Data.Should().Be(new OtpSentDto(Email, Now.AddMinutes(5)));
        await _otps.Received(1).ExpireActiveAsync(Email, OtpPurpose.Registration, Now, Arg.Any<CancellationToken>());
        stored!.Email.Should().Be(Email);
        stored.Purpose.Should().Be(OtpPurpose.Registration);
        stored.ExpiresAtUtc.Should().Be(Now.AddMinutes(5));
        stored.CreatedAtUtc.Should().Be(Now);
        stored.PendingRegistration.Should().Contain("Nguyễn Thị An").And.Contain("0912345678").And.Contain("hashed:" + Password);
        stored.PendingRegistration.Should().NotContain("\"" + Password + "\"");
        var mail = _sent.Should().ContainSingle().Subject;
        mail.ToEmail.Should().Be(Email);
        var otp = OtpFrom(mail);
        stored.CodeHash.Should().Be("hashed:" + otp).And.NotBe(otp);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RegisterRejectsExistingEmailBeforePhone()
    {
        _users.ExistsByEmailAsync(Email, Arg.Any<CancellationToken>()).Returns(true);
        _users.ExistsByPhoneAsync("0912345678", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => _service.RequestRegistrationOtpAsync(Register, CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("email_exists");
        _sent.Should().BeEmpty();
    }

    [Fact]
    public async Task RegisterRejectsExistingPhone()
    {
        _users.ExistsByPhoneAsync("0912345678", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => _service.RequestRegistrationOtpAsync(Register, CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("phone_exists");
    }

    [Fact]
    public async Task RegisterResendWithinCooldownIs429WithSeconds()
    {
        _otps.GetLastSentAtAsync(Email, OtpPurpose.Registration, Arg.Any<CancellationToken>()).Returns(Now.AddSeconds(-45));

        var act = () => _service.RequestRegistrationOtpAsync(Register, CancellationToken.None);

        var error = (await act.Should().ThrowAsync<TooManyRequestsException>()).Which;
        error.Code.Should().Be("rate_limited");
        error.Message.Should().Contain("15 giây");
        _sent.Should().BeEmpty();
    }

    [Fact]
    public async Task RegisterResendAfterCooldownSendsNewCode()
    {
        _otps.GetLastSentAtAsync(Email, OtpPurpose.Registration, Arg.Any<CancellationToken>()).Returns(Now.AddSeconds(-60));

        await _service.RequestRegistrationOtpAsync(Register, CancellationToken.None);

        _sent.Should().ContainSingle();
    }

    [Fact]
    public async Task MailFailureDeletesOtpAndRethrows()
    {
        OtpCode? stored = null;
        await _otps.AddAsync(Arg.Do<OtpCode>(otp => stored = otp), Arg.Any<CancellationToken>());
        _mail.SendAsync(Arg.Any<EmailMessage>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new ServiceUnavailableException("x", "email_send_failed"));

        var act = () => _service.RequestRegistrationOtpAsync(Register, CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be("email_send_failed");
        await _otps.Received(1).DeleteAsync(stored!.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AnySendFailureDeletesOtp()
    {
        OtpCode? stored = null;
        await _otps.AddAsync(Arg.Do<OtpCode>(otp => stored = otp), Arg.Any<CancellationToken>());
        _mail.SendAsync(Arg.Any<EmailMessage>(), Arg.Any<CancellationToken>()).ThrowsAsync(new OperationCanceledException());

        var act = () => _service.RequestRegistrationOtpAsync(Register, CancellationToken.None);

        await act.Should().ThrowAsync<OperationCanceledException>();
        await _otps.Received(1).DeleteAsync(stored!.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SendOtpLocksTheEmailInsideATransaction()
    {
        await _service.RequestRegistrationOtpAsync(Register, CancellationToken.None);

        await _otps.Received(1).LockAsync(Email, OtpPurpose.Registration, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("expired")]
    [InlineData("locked")]
    [InlineData("used")]
    public async Task ForgotVerifyFailuresAllReportInvalid(string state)
    {
        if (state != "missing")
        {
            _otps.FindLatestAsync(Email, OtpPurpose.PasswordReset, Arg.Any<CancellationToken>()).Returns(new OtpCode
            {
                Email = Email, Purpose = OtpPurpose.PasswordReset, CodeHash = "hashed:123456", CreatedAtUtc = Now.AddMinutes(-6),
                ExpiresAtUtc = state == "expired" ? Now.AddMinutes(-1) : Now.AddMinutes(3),
                FailedAttempts = state == "locked" ? 5 : 0, UsedAtUtc = state == "used" ? Now.AddMinutes(-1) : null,
            });
        }

        var act = () => _service.VerifyPasswordResetOtpAsync(new VerifyOtpRequest(Email, "123456"), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("otp_invalid");
    }

    [Fact]
    public async Task ForgotVerifyWithoutCodeStillSpendsHashTime()
    {
        _hasher.DummyHash.Returns("dummy");

        var act = () => _service.VerifyPasswordResetOtpAsync(new VerifyOtpRequest(Email, "123456"), CancellationToken.None);

        await act.Should().ThrowAsync<BusinessRuleException>();
        _hasher.Received(1).Verify("dummy", "123456");
    }

    [Fact]
    public async Task VerifyCreatesCustomerOnlyWithCorrectOtp()
    {
        var otp = PendingOtp("123456");
        User? created = null;
        await _users.AddAsync(Arg.Do<User>(user => created = user), Arg.Any<CancellationToken>());

        var result = await _service.VerifyRegistrationOtpAsync(new VerifyOtpRequest(Email, "123456"), CancellationToken.None);

        created!.FullName.Should().Be("Nguyễn Thị An");
        created.Email.Should().Be(Email);
        created.PhoneNumber.Should().Be("0912345678");
        created.PasswordHash.Should().Be("hashed:" + Password);
        created.Role.Should().Be(UserRole.Customer);
        created.Status.Should().Be(UserStatus.Active);
        await _customers.Received(1).AddAsync(Arg.Is<Customer>(customer => customer.Id == created.Id), Arg.Any<CancellationToken>());
        await _otps.Received(1).TryConsumeAsync(otp.Id, Now, 5, Arg.Any<CancellationToken>());
        result.Data.Should().Be(new RegisteredUserDto(created.Id, Email));
    }

    [Fact]
    public async Task VerifyWrongOtpRecordsFailureAndCreatesNothing()
    {
        var otp = PendingOtp("123456");
        _otps.TryRecordFailureAsync(otp.Id, 5, Arg.Any<CancellationToken>()).Returns(1);

        var act = () => _service.VerifyRegistrationOtpAsync(new VerifyOtpRequest(Email, "654321"), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("otp_invalid");
        await _users.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
        await _otps.DidNotReceive().TryConsumeAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(5)]
    [InlineData(null)]
    public async Task VerifyFifthFailureIsTooManyAttempts(int? countAfterFailure)
    {
        var otp = PendingOtp("123456", failedAttempts: 4);
        _otps.TryRecordFailureAsync(otp.Id, 5, Arg.Any<CancellationToken>()).Returns(countAfterFailure);

        var act = () => _service.VerifyRegistrationOtpAsync(new VerifyOtpRequest(Email, "654321"), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("otp_too_many_attempts");
    }

    [Fact]
    public async Task VerifyLockedOtpRejectsEvenTheCorrectCode()
    {
        PendingOtp("123456", failedAttempts: 5);

        var act = () => _service.VerifyRegistrationOtpAsync(new VerifyOtpRequest(Email, "123456"), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("otp_too_many_attempts");
        await _users.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task VerifyExpiredOtpDoesNotCountFailure()
    {
        PendingOtp("123456", expiresAtUtc: Now);

        var act = () => _service.VerifyRegistrationOtpAsync(new VerifyOtpRequest(Email, "654321"), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("otp_expired");
        await _otps.DidNotReceive().TryRecordFailureAsync(Arg.Any<Guid>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task VerifyUsedOrMissingOtpIsInvalid()
    {
        var act = () => _service.VerifyRegistrationOtpAsync(new VerifyOtpRequest(Email, "123456"), CancellationToken.None);
        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("otp_invalid");

        PendingOtp("123456", usedAtUtc: Now.AddSeconds(-5));
        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("otp_invalid");
    }

    [Fact]
    public async Task VerifyLosingTheConsumeRaceIsInvalid()
    {
        var otp = PendingOtp("123456");
        _otps.TryConsumeAsync(otp.Id, Now, 5, Arg.Any<CancellationToken>()).Returns(false);

        var act = () => _service.VerifyRegistrationOtpAsync(new VerifyOtpRequest(Email, "123456"), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("otp_invalid");
        await _users.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task VerifyRechecksEmailTakenWhileWaiting()
    {
        PendingOtp("123456");
        _users.ExistsByEmailAsync(Email, Arg.Any<CancellationToken>()).Returns(true);

        var act = () => _service.VerifyRegistrationOtpAsync(new VerifyOtpRequest(Email, "123456"), CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("email_exists");
    }

    [Fact]
    public async Task ForgotUnknownEmailReturnsSameResultWithoutMail()
    {
        var known = ActiveUser();
        var forKnown = await _service.RequestPasswordResetOtpAsync(new ForgotPasswordRequest(known.Email), CancellationToken.None);
        var forUnknown = await _service.RequestPasswordResetOtpAsync(new ForgotPasswordRequest("nobody@gmail.com"), CancellationToken.None);

        forKnown.Data!.ExpiresAtUtc.Should().Be(forUnknown.Data!.ExpiresAtUtc).And.Be(Now.AddMinutes(5));
        _sent.Should().ContainSingle().Which.Subject.Should().Contain("đặt lại mật khẩu");
    }

    [Theory]
    [InlineData(UserStatus.Locked)]
    [InlineData(UserStatus.Inactive)]
    public async Task ForgotNonActiveAccountSendsNoMail(UserStatus status)
    {
        var user = ActiveUser();
        user.Status = status;

        var result = await _service.RequestPasswordResetOtpAsync(new ForgotPasswordRequest(user.Email), CancellationToken.None);

        result.Data!.ExpiresAtUtc.Should().Be(Now.AddMinutes(5));
        _sent.Should().BeEmpty();
    }

    [Fact]
    public async Task ForgotWithinCooldownIsSilent()
    {
        var user = ActiveUser();
        _otps.GetLastSentAtAsync(user.Email, OtpPurpose.PasswordReset, Arg.Any<CancellationToken>()).Returns(Now.AddSeconds(-10));

        var result = await _service.RequestPasswordResetOtpAsync(new ForgotPasswordRequest(user.Email), CancellationToken.None);

        result.Data!.ExpiresAtUtc.Should().Be(Now.AddMinutes(5));
        _sent.Should().BeEmpty();
    }

    [Fact]
    public async Task ForgotVerifyReturnsResetTokenForTenMinutes()
    {
        var user = ActiveUser();
        ResetOtp("123456");
        _tokens.CreatePasswordResetToken(user, Now, Now.AddMinutes(10)).Returns(new AccessToken("reset-token", Now.AddMinutes(10)));

        var result = await _service.VerifyPasswordResetOtpAsync(new VerifyOtpRequest(user.Email, "123456"), CancellationToken.None);

        result.Data.Should().Be(new PasswordResetTokenDto("reset-token", Now.AddMinutes(10)));
    }

    [Fact]
    public async Task ForgotVerifyLockedAccountIsForbidden()
    {
        var user = ActiveUser();
        user.Status = UserStatus.Locked;
        ResetOtp("123456");

        var act = () => _service.VerifyPasswordResetOtpAsync(new VerifyOtpRequest(user.Email, "123456"), CancellationToken.None);

        (await act.Should().ThrowAsync<ForbiddenException>()).Which.Code.Should().Be("account_locked");
    }

    [Fact]
    public async Task ResetChangesHashAndRevokesSessions()
    {
        var user = ActiveUser();
        _tokens.ReadPasswordResetTokenAsync("reset-token", Now).Returns(new PasswordResetClaims(user.Id, "stamp:" + user.PasswordHash));

        await _service.ResetPasswordAsync(new ResetPasswordRequest("reset-token", "matkhaumoi9", "matkhaumoi9"), CancellationToken.None);

        user.PasswordHash.Should().Be("hashed:matkhaumoi9");
        await _refreshTokens.Received(1).RevokeAllActiveAsync(user.Id, Now, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResetWithStaleStampOrBadTokenIsInvalid()
    {
        var user = ActiveUser();
        _tokens.ReadPasswordResetTokenAsync("stale", Now).Returns(new PasswordResetClaims(user.Id, "stamp:old-hash"));
        var request = new ResetPasswordRequest("stale", "matkhaumoi9", "matkhaumoi9");

        (await FluentActions.Awaiting(() => _service.ResetPasswordAsync(request, CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("invalid_reset_token");
        (await FluentActions.Awaiting(() => _service.ResetPasswordAsync(request with { ResetToken = "garbage" }, CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("invalid_reset_token");
        user.PasswordHash.Should().Be("hashed:" + Password);
    }

    [Fact]
    public async Task ResetForLockedAccountIsInvalid()
    {
        var user = ActiveUser();
        user.Status = UserStatus.Locked;
        _tokens.ReadPasswordResetTokenAsync("reset-token", Now).Returns(new PasswordResetClaims(user.Id, "stamp:" + user.PasswordHash));

        var act = () => _service.ResetPasswordAsync(new ResetPasswordRequest("reset-token", "matkhaumoi9", "matkhaumoi9"), CancellationToken.None);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("invalid_reset_token");
    }

    private static string OtpFrom(EmailMessage mail) =>
        System.Text.RegularExpressions.Regex.Match(mail.TextBody, @"là: (\d{6})").Groups[1].Value;

    private OtpCode PendingOtp(string code, int failedAttempts = 0, DateTime? expiresAtUtc = null, DateTime? usedAtUtc = null)
    {
        var otp = new OtpCode
        {
            Email = Email, Purpose = OtpPurpose.Registration, CodeHash = "hashed:" + code, FailedAttempts = failedAttempts,
            ExpiresAtUtc = expiresAtUtc ?? Now.AddMinutes(3), UsedAtUtc = usedAtUtc, CreatedAtUtc = Now.AddMinutes(-2),
            PendingRegistration = $$"""{"fullName":"Nguyễn Thị An","phoneNumber":"0912345678","passwordHash":"hashed:{{Password}}"}""",
        };
        _otps.FindLatestAsync(Email, OtpPurpose.Registration, Arg.Any<CancellationToken>()).Returns(otp);
        return otp;
    }

    private void ResetOtp(string code)
    {
        var otp = new OtpCode
        {
            Email = Email, Purpose = OtpPurpose.PasswordReset, CodeHash = "hashed:" + code,
            ExpiresAtUtc = Now.AddMinutes(3), CreatedAtUtc = Now.AddMinutes(-2),
        };
        _otps.FindLatestAsync(Email, OtpPurpose.PasswordReset, Arg.Any<CancellationToken>()).Returns(otp);
    }

    private User ActiveUser()
    {
        var user = new User
        {
            FullName = "Nguyễn Thị An", Email = Email, PhoneNumber = "0912345678", PasswordHash = "hashed:" + Password,
            Role = UserRole.Customer, Status = UserStatus.Active,
        };
        _users.FindByEmailAsync(Email, Arg.Any<CancellationToken>()).Returns(user);
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);
        return user;
    }
}
