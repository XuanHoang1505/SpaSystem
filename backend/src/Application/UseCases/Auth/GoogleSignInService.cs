using FluentValidation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Storage;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Auth;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Auth;

/// <summary>
/// Sign-in with Google (docs/specs/auth.md, Q-84). A Google account is matched by its subject first, then by a verified
/// email (and linked); only a customer is ever created, after a sign-up step that asks for the phone number. A new or newly
/// linked account without an avatar gets a copy of the Google profile photo, best effort, after the session is saved.
/// </summary>
public sealed class GoogleSignInService : IGoogleSignInService
{
    private readonly IGoogleTokenValidator _googleTokens;
    private readonly IUserRepository _users;
    private readonly IRepository<Customer> _customers;
    private readonly IRepository<UserExternalLogin> _externalLogins;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly ITokenService _tokens;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<GoogleSignInOptions> _options;
    private readonly IValidator<GoogleSignInRequest> _signInValidator;
    private readonly IValidator<GoogleSignupCompleteRequest> _completeValidator;
    private readonly IFileStorage _storage;
    private readonly ILogger<GoogleSignInService> _logger;

    public GoogleSignInService(
        IGoogleTokenValidator googleTokens,
        IUserRepository users,
        IRepository<Customer> customers,
        IRepository<UserExternalLogin> externalLogins,
        IRefreshTokenRepository refreshTokens,
        ITokenService tokens,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IOptions<GoogleSignInOptions> options,
        IValidator<GoogleSignInRequest> signInValidator,
        IValidator<GoogleSignupCompleteRequest> completeValidator,
        IFileStorage storage,
        ILogger<GoogleSignInService> logger)
    {
        _googleTokens = googleTokens;
        _users = users;
        _customers = customers;
        _externalLogins = externalLogins;
        _refreshTokens = refreshTokens;
        _tokens = tokens;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options;
        _signInValidator = signInValidator;
        _completeValidator = completeValidator;
        _storage = storage;
        _logger = logger;
    }

    private GoogleSignInOptions Settings => _options.Value;

    public async Task<OperationResult<GoogleSignInResultDto>> SignInAsync(GoogleSignInRequest request, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        request = new GoogleSignInRequest(Trim(request.IdToken));
        await _signInValidator.ValidateAndThrowAsync(request, cancellationToken);
        var identity = await _googleTokens.ValidateAsync(request.IdToken, cancellationToken) ?? throw GoogleSignInErrors.TokenInvalid();
        if (!identity.EmailVerified || string.IsNullOrWhiteSpace(identity.Email))
            throw GoogleSignInErrors.EmailUnverified();

        var now = _clock.UtcNow;
        var account = await FindAccountAsync(identity, cancellationToken);
        if (account is null)
        {
            var token = _tokens.CreateGoogleSignupToken(identity, now, now.AddMinutes(Settings.SignupTokenExpirationMinutes));
            return OperationResult<GoogleSignInResultDto>.Success(GoogleSignInResultDto.NeedsProfile(
                new GoogleSignupDto(token.Token, token.ExpiresAtUtc, identity.Email, SuggestedName(identity))));
        }

        var session = await SignInAccountAsync(account.Value, identity, now, cancellationToken);
        return OperationResult<GoogleSignInResultDto>.Success(GoogleSignInResultDto.SignedIn(session));
    }

    public async Task<OperationResult<AuthResultDto>> CompleteSignupAsync(GoogleSignupCompleteRequest request, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        request = new GoogleSignupCompleteRequest(Trim(request.SignupToken), Trim(request.FullName), Trim(request.PhoneNumber));
        await _completeValidator.ValidateAndThrowAsync(request, cancellationToken);
        var now = _clock.UtcNow;
        var identity = await _tokens.ReadGoogleSignupTokenAsync(request.SignupToken, now) ?? throw GoogleSignInErrors.SignupTokenInvalid();

        // Sent twice, or an account with this email appeared meanwhile: sign that account in instead of creating another.
        var account = await FindAccountAsync(identity, cancellationToken);
        if (account is not null)
            return OperationResult<AuthResultDto>.Success(await SignInAccountAsync(account.Value, identity, now, cancellationToken));

        if (await _users.ExistsByPhoneAsync(request.PhoneNumber, cancellationToken))
            throw AccountErrors.PhoneExists();
        var user = new User
        {
            FullName = request.FullName,
            Email = identity.Email,
            PhoneNumber = request.PhoneNumber,
            // No password (Q-84): password login is refused until one is set through "forgot password".
            PasswordHash = string.Empty,
            Role = UserRole.Customer,
            Status = UserStatus.Active,
        };
        AuthResultDto? session = null;
        try
        {
            await _unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                await _users.AddAsync(user, token);
                await _customers.AddAsync(new Customer { Id = user.Id }, token);
                await _externalLogins.AddAsync(NewLink(user, identity, now), token);
                session = await AuthSessions.IssueAsync(_tokens, _refreshTokens, user, now, token);
                await _unitOfWork.SaveChangesAsync(token);
            }, cancellationToken);
        }
        catch (ConflictException exception) when (exception.Code == DuplicateValueCode)
        {
            // The same email or Google account committed between our checks and the insert.
            throw await _users.ExistsByEmailAsync(user.Email, cancellationToken)
                ? AccountErrors.EmailExists()
                : GoogleSignInErrors.AccountConflict();
        }
        await TryCopyGooglePhotoAsync(user, identity, cancellationToken);
        return OperationResult<AuthResultDto>.Success(session!, "Đã tạo tài khoản.");
    }

    private const string DuplicateValueCode = "duplicate_value";

    /// <summary>The linked account, else the account of the same email (to be linked); null when there is none.</summary>
    private async Task<(User User, bool Link)?> FindAccountAsync(GoogleIdentity identity, CancellationToken cancellationToken)
    {
        var linked = await _users.FindByExternalLoginAsync(ExternalLoginProvider.Google, identity.Subject, cancellationToken);
        if (linked is not null)
            return (linked, false);
        var sameEmail = await _users.FindByEmailAsync(identity.Email, cancellationToken);
        if (sameEmail is null)
            return null;
        // One Google account per user: this account is already linked to another Google account.
        if (await _users.HasExternalLoginAsync(sameEmail.Id, ExternalLoginProvider.Google, cancellationToken))
            throw GoogleSignInErrors.AccountConflict();
        return (sameEmail, true);
    }

    /// <summary>Checks role and status before linking, so a locked or refused account is never linked.</summary>
    private async Task<AuthResultDto> SignInAccountAsync((User User, bool Link) account, GoogleIdentity identity, DateTime now,
        CancellationToken cancellationToken)
    {
        var user = account.User;
        if (user.Role != UserRole.Customer && !Settings.AllowStaffAndOwner)
            throw GoogleSignInErrors.NotAllowed();
        await AuthSessions.EnsureCanSignInAsync(_users, user, now, cancellationToken);
        if (account.Link)
            await _externalLogins.AddAsync(NewLink(user, identity, now), cancellationToken);
        var session = await AuthSessions.IssueAsync(_tokens, _refreshTokens, user, now, cancellationToken);
        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (ConflictException exception) when (exception.Code == DuplicateValueCode)
        {
            // Another request linked a Google account to this user at the same moment.
            throw GoogleSignInErrors.AccountConflict();
        }
        if (account.Link)
            await TryCopyGooglePhotoAsync(user, identity, cancellationToken);
        return session;
    }

    /// <summary>
    /// Q-84: when an account is created or first linked to Google and has no avatar, it takes the Google profile photo,
    /// copied to <c>avatars/{userId}</c> so changing and deleting it work like any avatar (a deleted avatar is not brought
    /// back by later sign-ins). Runs after the session is committed; a failure is only logged and never blocks sign-in.
    /// </summary>
    private async Task TryCopyGooglePhotoAsync(User user, GoogleIdentity identity, CancellationToken cancellationToken)
    {
        if (user.AvatarUrl is not null || AvatarImages.GooglePhotoUrl(identity.PictureUrl) is not { } photo)
            return;
        try
        {
            var url = await _storage.UploadImageFromUrlAsync(photo, AvatarImages.PublicId(user.Id), cancellationToken);
            user.SetAvatar(url);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "Could not copy the Google profile photo of user {UserId}.", user.Id);
        }
    }

    private void EnsureConfigured()
    {
        if (!Settings.IsConfigured)
            throw GoogleSignInErrors.Unavailable();
    }

    private static UserExternalLogin NewLink(User user, GoogleIdentity identity, DateTime now) => new()
    {
        UserId = user.Id,
        Provider = ExternalLoginProvider.Google,
        ProviderKey = identity.Subject,
        Email = identity.Email,
        CreatedAtUtc = now,
    };

    private static string SuggestedName(GoogleIdentity identity)
    {
        var name = identity.Name?.Trim() ?? string.Empty;
        return name.Length > 100 ? name[..100] : name;
    }

    private static string Trim(string? value) => value?.Trim() ?? string.Empty;
}
