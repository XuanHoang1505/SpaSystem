using FluentAssertions;
using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Users;
using NhuNguyetSpa.Application.Validators.Users;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Users;

/// <summary>UC-SPA-05 (docs/specs/auth.md, BR-AUTH-14, 15, 18; AUTH-T41).</summary>
public sealed class UserAccountServiceTests
{
    private static readonly DateTime Now = new(2026, 11, 1, 3, 0, 0, DateTimeKind.Utc);

    private readonly Guid _ownerId = Guid.NewGuid();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IDateTimeProvider _clock = Substitute.For<IDateTimeProvider>();
    private readonly User _customer = new()
    {
        FullName = "Khách A", Email = "a@spa.test", PhoneNumber = "0912345678", Role = UserRole.Customer, Status = UserStatus.Active,
    };
    private readonly UserAccountService _sut;

    public UserAccountServiceTests()
    {
        _clock.UtcNow.Returns(Now);
        _currentUser.UserId.Returns(_ownerId);
        _users.GetByIdAsync(_customer.Id, Arg.Any<CancellationToken>()).Returns(_customer);
        _users.GetDetailAsync(_customer.Id, Arg.Any<CancellationToken>()).Returns(call => Detail(_customer));
        _sut = new UserAccountService(
            _currentUser, _users, _refreshTokens, new UserProfileEditor(_users, new UpdateProfileRequestValidator(_clock)), _unitOfWork, _clock,
            new UserFilterValidator(), new ChangeUserStatusRequestValidator());
    }

    private static UserDetailDto Detail(User user) => new(
        user.Id, user.FullName, user.Email, user.PhoneNumber, user.Role, user.Status, user.AvatarUrl, user.DateOfBirth, user.Gender,
        user.CreatedAtUtc, user.UpdatedAtUtc, null);

    [Fact]
    public async Task SearchPassesNormalisedCriteria()
    {
        _users.SearchAsync(Arg.Any<UserSearchCriteria>(), Arg.Any<CancellationToken>()).Returns(new PagedResult<UserListItemDto>([], 2, 5, 0));

        await _sut.SearchAsync(
            new PagedQuery { Search = "  nguyen  ", PageNumber = 2, PageSize = 5 }, new UserFilter { Role = "Staff", Status = "locked" }, CancellationToken.None);

        await _users.Received(1).SearchAsync(new UserSearchCriteria("nguyen", UserRole.Staff, UserStatus.Locked, 2, 5), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task BlankSearchAndFiltersBecomeNull()
    {
        _users.SearchAsync(Arg.Any<UserSearchCriteria>(), Arg.Any<CancellationToken>()).Returns(new PagedResult<UserListItemDto>([], 1, 10, 0));

        await _sut.SearchAsync(new PagedQuery { Search = "   " }, new UserFilter(), CancellationToken.None);

        await _users.Received(1).SearchAsync(new UserSearchCriteria(null, null, null, 1, 10), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task TooLongSearchIsRejected()
    {
        await FluentActions.Awaiting(() => _sut.SearchAsync(new PagedQuery { Search = new string('a', 101) }, new UserFilter(), CancellationToken.None))
            .Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task UnknownUserIsNotFound()
    {
        (await FluentActions.Awaiting(() => _sut.GetAsync(Guid.NewGuid(), CancellationToken.None)).Should().ThrowAsync<NotFoundException>())
            .Which.Code.Should().Be("user_not_found");
        (await FluentActions.Awaiting(() => _sut.UpdateAsync(Guid.NewGuid(), new UpdateProfileRequest("An", "0900000000", null, null), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("user_not_found");
    }

    [Fact]
    public async Task UpdateAppliesProfileAndReturnsDetail()
    {
        var result = await _sut.UpdateAsync(_customer.Id, new UpdateProfileRequest(" Khách B ", "0987654321", null, Gender.Other), CancellationToken.None);

        _customer.FullName.Should().Be("Khách B");
        _customer.Gender.Should().Be(Gender.Other);
        result.Data!.PhoneNumber.Should().Be("0987654321");
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateWithTakenPhoneConflicts()
    {
        _users.ExistsByPhoneAsync("0987654321", Arg.Any<CancellationToken>()).Returns(true);

        (await FluentActions.Awaiting(() => _sut.UpdateAsync(_customer.Id, new UpdateProfileRequest("A", "0987654321", null, null), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("phone_exists");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task OwnerCannotLockSelf()
    {
        (await FluentActions.Awaiting(() => _sut.ChangeStatusAsync(_ownerId, new ChangeUserStatusRequest(UserStatus.Locked), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("cannot_lock_self");
        await _users.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task OwnerMayActivateSelf()
    {
        var owner = new User { Role = UserRole.Owner, Status = UserStatus.Active };
        _currentUser.UserId.Returns(owner.Id);
        _users.GetByIdAsync(owner.Id, Arg.Any<CancellationToken>()).Returns(owner);

        await _sut.ChangeStatusAsync(owner.Id, new ChangeUserStatusRequest(UserStatus.Active), CancellationToken.None);

        owner.Status.Should().Be(UserStatus.Active);
    }

    [Fact]
    public async Task LockRevokesSessions()
    {
        await _sut.ChangeStatusAsync(_customer.Id, new ChangeUserStatusRequest(UserStatus.Locked), CancellationToken.None);

        _customer.Status.Should().Be(UserStatus.Locked);
        await _refreshTokens.Received(1).DeleteAllActiveAsync(_customer.Id, Now, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LockingLockedUserDoesNothing()
    {
        _customer.Status = UserStatus.Locked;

        await _sut.ChangeStatusAsync(_customer.Id, new ChangeUserStatusRequest(UserStatus.Locked), CancellationToken.None);

        await _refreshTokens.DidNotReceive().DeleteAllActiveAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UnlockKeepsSessionsUntouched()
    {
        _customer.Status = UserStatus.Locked;

        await _sut.ChangeStatusAsync(_customer.Id, new ChangeUserStatusRequest(UserStatus.Active), CancellationToken.None);

        _customer.Status.Should().Be(UserStatus.Active);
        await _refreshTokens.DidNotReceive().DeleteAllActiveAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task InactiveUserCannotChangeStatus()
    {
        _customer.Status = UserStatus.Inactive;

        (await FluentActions.Awaiting(() => _sut.ChangeStatusAsync(_customer.Id, new ChangeUserStatusRequest(UserStatus.Locked), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("account_inactive");
    }

    [Fact]
    public async Task StatusChangeOfUnknownUserIsNotFound()
    {
        (await FluentActions.Awaiting(() => _sut.ChangeStatusAsync(Guid.NewGuid(), new ChangeUserStatusRequest(UserStatus.Locked), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("user_not_found");
    }
}
