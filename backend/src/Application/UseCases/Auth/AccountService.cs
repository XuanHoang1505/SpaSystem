using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Auth;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>UC-SPA-01 (registration by email OTP) and UC-SPA-03 (password reset by email OTP), docs/specs/auth.md.</summary>
public sealed class AccountService : IAccountService
{
    private static readonly JsonSerializerOptions PendingJson = new(JsonSerializerDefaults.Web)
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
    };

    private readonly IUserRepository _users;
    private readonly IRepository<Customer> _customers;
    private readonly IOtpCodeRepository _otpCodes;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokens;
    private readonly IEmailSender _emailSender;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<AccountOptions> _options;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<VerifyOtpRequest> _verifyValidator;
    private readonly IValidator<ForgotPasswordRequest> _forgotValidator;
    private readonly IValidator<ResetPasswordRequest> _resetValidator;

    public AccountService(
        IUserRepository users,
        IRepository<Customer> customers,
        IOtpCodeRepository otpCodes,
        IRefreshTokenRepository refreshTokens,
        IPasswordHasher passwordHasher,
        ITokenService tokens,
        IEmailSender emailSender,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IOptions<AccountOptions> options,
        IValidator<RegisterRequest> registerValidator,
        IValidator<VerifyOtpRequest> verifyValidator,
        IValidator<ForgotPasswordRequest> forgotValidator,
        IValidator<ResetPasswordRequest> resetValidator)
    {
        _users = users;
        _customers = customers;
        _otpCodes = otpCodes;
        _refreshTokens = refreshTokens;
        _passwordHasher = passwordHasher;
        _tokens = tokens;
        _emailSender = emailSender;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options;
        _registerValidator = registerValidator;
        _verifyValidator = verifyValidator;
        _forgotValidator = forgotValidator;
        _resetValidator = resetValidator;
    }

    private AccountOptions Settings => _options.Value;

    public async Task<OperationResult<OtpSentDto>> RequestRegistrationOtpAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        request = request with
        {
            FullName = Trim(request.FullName), Email = Trim(request.Email), PhoneNumber = Trim(request.PhoneNumber),
        };
        await _registerValidator.ValidateAndThrowAsync(request, cancellationToken);
        if (await _users.ExistsByEmailAsync(request.Email, cancellationToken))
            throw AccountErrors.EmailExists();
        if (await _users.ExistsByPhoneAsync(request.PhoneNumber, cancellationToken))
            throw AccountErrors.PhoneExists();

        var now = _clock.UtcNow;
        var pending = JsonSerializer.Serialize(
            new PendingRegistration(request.FullName, request.PhoneNumber, _passwordHasher.Hash(request.Password)), PendingJson);
        var issued = await IssueOtpAsync(request.Email, OtpPurpose.Registration, pending, now, cancellationToken);
        if (issued.Wait > TimeSpan.Zero)
            throw AccountErrors.ResendTooSoon((int)Math.Ceiling(issued.Wait.TotalSeconds));

        await SendOtpMailAsync(issued.Otp!, issued.Code!, request.FullName, cancellationToken);
        return OperationResult<OtpSentDto>.Success(new OtpSentDto(request.Email, issued.Otp!.ExpiresAtUtc));
    }

    public async Task<OperationResult<RegisteredUserDto>> VerifyRegistrationOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        request = await NormalizeAndValidateAsync(request, cancellationToken);
        var now = _clock.UtcNow;
        var otp = await CheckOtpAsync(request, OtpPurpose.Registration, now, cancellationToken);
        var pending = (otp.PendingRegistration is null ? null : JsonSerializer.Deserialize<PendingRegistration>(otp.PendingRegistration, PendingJson))
            ?? throw AccountErrors.OtpInvalid();

        var user = new User
        {
            FullName = pending.FullName,
            Email = otp.Email,
            PhoneNumber = pending.PhoneNumber,
            PasswordHash = pending.PasswordHash,
            Role = UserRole.Customer,
            Status = UserStatus.Active,
        };
        try
        {
            await _unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                // Consumed inside the transaction: if the account cannot be created, the code stays usable.
                if (!await _otpCodes.TryConsumeAsync(otp.Id, now, Settings.OtpMaxFailedAttempts, token))
                    throw AccountErrors.OtpInvalid();
                if (await _users.ExistsByEmailAsync(user.Email, token))
                    throw AccountErrors.EmailExists();
                if (await _users.ExistsByPhoneAsync(user.PhoneNumber, token))
                    throw AccountErrors.PhoneExists();
                await _users.AddAsync(user, token);
                await _customers.AddAsync(new Customer { Id = user.Id }, token);
                await _unitOfWork.SaveChangesAsync(token);
            }, cancellationToken);
        }
        catch (ConflictException exception) when (exception.Code == "duplicate_value")
        {
            // Another registration with the same email or phone committed between our check and insert.
            throw await _users.ExistsByEmailAsync(user.Email, cancellationToken) ? AccountErrors.EmailExists() : AccountErrors.PhoneExists();
        }
        return OperationResult<RegisteredUserDto>.Success(new RegisteredUserDto(user.Id, user.Email));
    }

    public async Task<OperationResult<OtpSentDto>> RequestPasswordResetOtpAsync(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        request = new ForgotPasswordRequest(Trim(request.Email));
        await _forgotValidator.ValidateAndThrowAsync(request, cancellationToken);
        var now = _clock.UtcNow;

        // BR-AUTH-05: unknown, non-active and throttled requests get the same answer, and no mail is sent.
        var user = await _users.FindByEmailAsync(request.Email, cancellationToken);
        if (user is { Status: UserStatus.Active })
        {
            var issued = await IssueOtpAsync(user.Email, OtpPurpose.PasswordReset, null, now, cancellationToken);
            if (issued.Otp is not null)
                await SendOtpMailAsync(issued.Otp, issued.Code!, user.FullName, cancellationToken);
        }

        return OperationResult<OtpSentDto>.Success(new OtpSentDto(request.Email, now.AddMinutes(Settings.OtpExpirationMinutes)));
    }

    public async Task<OperationResult<PasswordResetTokenDto>> VerifyPasswordResetOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        request = await NormalizeAndValidateAsync(request, cancellationToken);
        var now = _clock.UtcNow;
        var otp = await CheckOtpAsync(request, OtpPurpose.PasswordReset, now, cancellationToken);
        if (!await _otpCodes.TryConsumeAsync(otp.Id, now, Settings.OtpMaxFailedAttempts, cancellationToken))
            throw AccountErrors.OtpInvalid();

        var user = await _users.FindByEmailAsync(otp.Email, cancellationToken) ?? throw AccountErrors.OtpInvalid();
        if (user.Status != UserStatus.Active)
            throw AuthErrors.NotActive(user.Status);

        var token = _tokens.CreatePasswordResetToken(user, now, now.AddMinutes(Settings.PasswordResetTokenExpirationMinutes));
        return OperationResult<PasswordResetTokenDto>.Success(new PasswordResetTokenDto(token.Token, token.ExpiresAtUtc));
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await _resetValidator.ValidateAndThrowAsync(request, cancellationToken);
        var now = _clock.UtcNow;
        var claims = await _tokens.ReadPasswordResetTokenAsync(request.ResetToken, now) ?? throw AccountErrors.InvalidResetToken();
        var user = await _users.GetByIdAsync(claims.UserId, cancellationToken);
        // The stamp changes with the password, so a token that was already used no longer matches (BR-AUTH-09).
        if (user is not { Status: UserStatus.Active } || _tokens.ComputePasswordStamp(user.PasswordHash) != claims.PasswordStamp)
            throw AccountErrors.InvalidResetToken();

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        await _refreshTokens.RevokeAllActiveAsync(user.Id, now, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<VerifyOtpRequest> NormalizeAndValidateAsync(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        request = new VerifyOtpRequest(Trim(request.Email), Trim(request.Otp));
        await _verifyValidator.ValidateAndThrowAsync(request, cancellationToken);
        return request;
    }

    private sealed record IssuedOtp(OtpCode? Otp, string? Code, TimeSpan Wait);

    /// <summary>
    /// Under a per-(email, purpose) lock: if the cooldown has passed, replaces any active code with a new one and commits it.
    /// Otherwise returns the remaining wait and no code, so two simultaneous requests cannot both issue one (BR-AUTH-07).
    /// </summary>
    private async Task<IssuedOtp> IssueOtpAsync(string email, OtpPurpose purpose, string? pendingRegistration, DateTime now,
        CancellationToken cancellationToken)
    {
        var issued = new IssuedOtp(null, null, TimeSpan.Zero);
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            await _otpCodes.LockAsync(email, purpose, token);
            var lastSentAtUtc = await _otpCodes.GetLastSentAtAsync(email, purpose, token);
            var wait = lastSentAtUtc is null ? TimeSpan.Zero : lastSentAtUtc.Value.AddSeconds(Settings.OtpResendCooldownSeconds) - now;
            if (wait > TimeSpan.Zero)
            {
                issued = new IssuedOtp(null, null, wait);
                return;
            }

            var code = OtpCodeGenerator.Generate();
            var otp = new OtpCode
            {
                Email = email,
                Purpose = purpose,
                CodeHash = _passwordHasher.Hash(code),
                PendingRegistration = pendingRegistration,
                ExpiresAtUtc = now.AddMinutes(Settings.OtpExpirationMinutes),
                CreatedAtUtc = now,
            };
            await _otpCodes.ExpireActiveAsync(email, purpose, now, token);
            await _otpCodes.AddAsync(otp, token);
            await _unitOfWork.SaveChangesAsync(token);
            issued = new IssuedOtp(otp, code, TimeSpan.Zero);
        }, cancellationToken);
        return issued;
    }

    /// <summary>Mails a committed code; any failure deletes it, so no usable code is left and the cooldown does not start.</summary>
    private async Task SendOtpMailAsync(OtpCode otp, string code, string recipientName, CancellationToken cancellationToken)
    {
        try
        {
            await _emailSender.SendAsync(
                OtpEmailTemplates.Create(otp.Purpose, otp.Email, recipientName, code, Settings.OtpExpirationMinutes), cancellationToken);
        }
        catch
        {
            await _otpCodes.DeleteAsync(otp.Id, CancellationToken.None);
            throw;
        }
    }

    /// <summary>
    /// Returns the newest code if <paramref name="request"/> matches it; wrong guesses are counted atomically.
    /// For password reset every failure is <c>otp_invalid</c> and a missing code still costs one hash check,
    /// so the answers do not reveal whether the email has an account (BR-AUTH-05).
    /// </summary>
    private async Task<OtpCode> CheckOtpAsync(VerifyOtpRequest request, OtpPurpose purpose, DateTime now, CancellationToken cancellationToken)
    {
        var max = Settings.OtpMaxFailedAttempts;
        var hideState = purpose == OtpPurpose.PasswordReset;
        var otp = await _otpCodes.FindLatestAsync(request.Email, purpose, cancellationToken);
        if (otp is null)
        {
            if (hideState)
                _passwordHasher.Verify(_passwordHasher.DummyHash, request.Otp);
            throw AccountErrors.OtpInvalid();
        }
        if (otp.UsedAtUtc is not null)
            throw AccountErrors.OtpInvalid();
        if (otp.FailedAttempts >= max)
            throw hideState ? AccountErrors.OtpInvalid() : AccountErrors.OtpTooManyAttempts();
        if (otp.ExpiresAtUtc <= now)
            throw hideState ? AccountErrors.OtpInvalid() : AccountErrors.OtpExpired();
        if (!_passwordHasher.Verify(otp.CodeHash, request.Otp))
        {
            var failures = await _otpCodes.TryRecordFailureAsync(otp.Id, max, cancellationToken);
            throw !hideState && (failures is null || failures >= max) ? AccountErrors.OtpTooManyAttempts() : AccountErrors.OtpInvalid();
        }
        return otp;
    }

    private static string Trim(string? value) => value?.Trim() ?? string.Empty;
}
