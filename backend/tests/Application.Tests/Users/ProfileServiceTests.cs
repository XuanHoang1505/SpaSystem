using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Storage;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Application.Tests.Catalog;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.UseCases.Users;
using NhuNguyetSpa.Application.Validators.Users;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Users;

/// <summary>UC-SPA-04 (docs/specs/auth.md, BR-AUTH-14..16, 19; AUTH-T41).</summary>
public sealed class ProfileServiceTests
{
    private static readonly DateTime Now = new(2026, 11, 1, 3, 0, 0, DateTimeKind.Utc);

    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();
    private readonly IFileStorage _storage = Substitute.For<IFileStorage>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IDateTimeProvider _clock = Substitute.For<IDateTimeProvider>();
    private readonly AccountOptions _accountOptions = new();
    private readonly User _user = new()
    {
        FullName = "Nguyễn Thị An",
        Email = "an@spa.test",
        PhoneNumber = "0912345678",
        PasswordHash = "old-hash",
        Role = UserRole.Customer,
        Status = UserStatus.Active,
    };

    public ProfileServiceTests()
    {
        _clock.UtcNow.Returns(Now);
        _currentUser.UserId.Returns(_user.Id);
        _users.GetByIdAsync(_user.Id, Arg.Any<CancellationToken>()).Returns(_user);
        _hasher.Hash(Arg.Any<string>()).Returns(call => "hash:" + call.Arg<string>());
        _storage.UploadImageAsync(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(call => "https://img.test/" + call.ArgAt<string>(1));
    }

    private ProfileService Sut() => new(
        _currentUser, _users, _refreshTokens, _hasher, _storage,
        new ImageUploadReader(Options.Create(new ImageUploadOptions())),
        new UserProfileEditor(_users, new UpdateProfileRequestValidator(_clock)),
        _unitOfWork, _clock, new ChangePasswordRequestValidator(Options.Create(_accountOptions)), Options.Create(_accountOptions));

    private static ImageUploadRequest Jpeg() => new(new MemoryStream(ImageFormatDetectorTests.Jpeg), ImageFormatDetectorTests.Jpeg.Length);

    [Fact]
    public async Task GetReturnsCurrentUser()
    {
        var result = await Sut().GetAsync(CancellationToken.None);

        result.Data!.Id.Should().Be(_user.Id);
        result.Data.Email.Should().Be("an@spa.test");
        result.Data.Role.Should().Be(UserRole.Customer);
    }

    [Fact]
    public async Task MissingUserIsNotFound()
    {
        _users.GetByIdAsync(_user.Id, Arg.Any<CancellationToken>()).Returns((User?)null);

        (await FluentActions.Awaiting(() => Sut().GetAsync(CancellationToken.None)).Should().ThrowAsync<NotFoundException>())
            .Which.Code.Should().Be("user_not_found");
    }

    [Fact]
    public async Task AnonymousCallerIsNotFound()
    {
        _currentUser.UserId.Returns((Guid?)null);

        (await FluentActions.Awaiting(() => Sut().GetAsync(CancellationToken.None)).Should().ThrowAsync<NotFoundException>())
            .Which.Code.Should().Be("user_not_found");
    }

    [Fact]
    public async Task UpdateTrimsAndSaves()
    {
        var result = await Sut().UpdateAsync(new UpdateProfileRequest("  Trần Thị B  ", " 0987654321 ", new DateOnly(1990, 2, 3), null), CancellationToken.None);

        _user.FullName.Should().Be("Trần Thị B");
        _user.PhoneNumber.Should().Be("0987654321");
        _user.DateOfBirth.Should().Be(new DateOnly(1990, 2, 3));
        result.Data!.FullName.Should().Be("Trần Thị B");
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PhoneOfAnotherAccountConflicts()
    {
        _users.ExistsByPhoneAsync("0987654321", Arg.Any<CancellationToken>()).Returns(true);

        (await FluentActions.Awaiting(() => Sut().UpdateAsync(new UpdateProfileRequest("An", "0987654321", null, null), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("phone_exists");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        _user.PhoneNumber.Should().Be("0912345678");
    }

    [Fact]
    public async Task OwnPhoneIsNotCheckedForDuplicates()
    {
        await Sut().UpdateAsync(new UpdateProfileRequest("An", "0912345678", null, Gender.Female), CancellationToken.None);

        await _users.DidNotReceive().ExistsByPhoneAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task WrongCurrentPasswordChangesNothing()
    {
        _hasher.Verify("old-hash", "sai123456").Returns(false);

        (await FluentActions.Awaiting(() => Sut().ChangePasswordAsync(new ChangePasswordRequest("sai123456", "matkhau456", "matkhau456"), CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be("current_password_incorrect");
        _user.PasswordHash.Should().Be("old-hash");
        await _refreshTokens.DidNotReceive().RevokeAllActiveAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ChangePasswordStoresNewHashAndRevokesSessions()
    {
        _hasher.Verify("old-hash", "matkhau123").Returns(true);

        await Sut().ChangePasswordAsync(new ChangePasswordRequest("matkhau123", "matkhau456", "matkhau456"), CancellationToken.None);

        _user.PasswordHash.Should().Be("hash:matkhau456");
        await _refreshTokens.Received(1).RevokeAllActiveAsync(_user.Id, Now, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ChangePasswordKeepsSessionsWhenConfigured()
    {
        _accountOptions.RevokeSessionsOnPasswordChange = false;
        _hasher.Verify("old-hash", "matkhau123").Returns(true);

        await Sut().ChangePasswordAsync(new ChangePasswordRequest("matkhau123", "matkhau456", "matkhau456"), CancellationToken.None);

        await _refreshTokens.DidNotReceive().RevokeAllActiveAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UploadAvatarStoresUnderUserFolder()
    {
        var result = await Sut().UploadAvatarAsync(Jpeg(), CancellationToken.None);

        result.Data!.AvatarUrl.Should().Be($"https://img.test/avatars/{_user.Id}");
        _user.AvatarUrl.Should().Be(result.Data.AvatarUrl);
        await _storage.Received(1).UploadImageAsync(Arg.Any<Stream>(), $"avatars/{_user.Id}", "image/jpeg", Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StorageFailureKeepsCurrentAvatar()
    {
        _user.AvatarUrl = "https://img.test/old";
        _storage.UploadImageAsync(Arg.Any<Stream>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Throws(CatalogErrors.ImageStorageUnavailable());

        await FluentActions.Awaiting(() => Sut().UploadAvatarAsync(Jpeg(), CancellationToken.None)).Should().ThrowAsync<ServiceUnavailableException>();

        _user.AvatarUrl.Should().Be("https://img.test/old");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteWithoutAvatarSkipsStorage()
    {
        await Sut().DeleteAvatarAsync(CancellationToken.None);

        await _storage.DidNotReceive().DeleteAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteRemovesAvatar()
    {
        _user.AvatarUrl = "https://img.test/old";

        await Sut().DeleteAvatarAsync(CancellationToken.None);

        await _storage.Received(1).DeleteAsync($"avatars/{_user.Id}", Arg.Any<CancellationToken>());
        _user.AvatarUrl.Should().BeNull();
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
