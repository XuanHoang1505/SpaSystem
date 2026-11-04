using FluentAssertions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Users;

/// <summary>State changes of User for UC-SPA-04/05 (docs/specs/auth.md, BR-AUTH-14, 18, 19).</summary>
public sealed class UserTests
{
    [Fact]
    public void LockChangesActiveToLocked()
    {
        var user = new User { Status = UserStatus.Active };

        user.Lock().Should().BeTrue();

        user.Status.Should().Be(UserStatus.Locked);
    }

    [Fact]
    public void LockingLockedUserChangesNothing()
    {
        var user = new User { Status = UserStatus.Locked };

        user.Lock().Should().BeFalse();

        user.Status.Should().Be(UserStatus.Locked);
    }

    [Fact]
    public void UnlockChangesLockedToActive()
    {
        var user = new User { Status = UserStatus.Locked };

        user.Unlock().Should().BeTrue();

        user.Status.Should().Be(UserStatus.Active);
    }

    [Fact]
    public void UnlockingActiveUserChangesNothing()
    {
        var user = new User { Status = UserStatus.Active };

        user.Unlock().Should().BeFalse();
    }

    [Fact]
    public void InactiveUserCannotBeLockedOrUnlocked()
    {
        var user = new User { Status = UserStatus.Inactive };

        FluentActions.Invoking(() => user.Lock()).Should().Throw<ConflictException>().Which.Code.Should().Be("account_inactive");
        FluentActions.Invoking(() => user.Unlock()).Should().Throw<ConflictException>().Which.Code.Should().Be("account_inactive");
        user.Status.Should().Be(UserStatus.Inactive);
    }

    [Fact]
    public void UpdateProfileSetsPersonalFields()
    {
        var user = new User { FullName = "Cũ", PhoneNumber = "0900000000", Gender = Gender.Male, DateOfBirth = new DateOnly(1990, 1, 1) };

        user.UpdateProfile("Mới", "0911111111", null, Gender.Female);

        user.FullName.Should().Be("Mới");
        user.PhoneNumber.Should().Be("0911111111");
        user.DateOfBirth.Should().BeNull();
        user.Gender.Should().Be(Gender.Female);
    }

    [Fact]
    public void AvatarCanBeSetAndRemoved()
    {
        var user = new User();

        user.SetAvatar("https://img.test/avatars/1");
        user.AvatarUrl.Should().Be("https://img.test/avatars/1");

        user.RemoveAvatar();
        user.AvatarUrl.Should().BeNull();
    }

    [Fact]
    public void ChangePasswordHashReplacesHash()
    {
        var user = new User { PasswordHash = "old" };

        user.ChangePasswordHash("new");

        user.PasswordHash.Should().Be("new");
    }
}
