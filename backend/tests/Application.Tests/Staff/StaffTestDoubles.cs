using NhuNguyetSpa.Application.Common.Interfaces;
using NSubstitute;

namespace NhuNguyetSpa.Application.Tests.Staff;

internal static class StaffTestDoubles
{
    /// <summary>17:30 UTC on 26/10 is already 00:30 on 27/10 in Vietnam.</summary>
    public static readonly DateTime Now = new(2026, 10, 26, 17, 30, 0, DateTimeKind.Utc);

    public static readonly DateOnly VietnamToday = new(2026, 10, 27);

    public static IDateTimeProvider Clock()
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        return clock;
    }

    public static ICurrentUserService User(string? role)
    {
        var user = Substitute.For<ICurrentUserService>();
        user.IsAuthenticated.Returns(role is not null);
        user.Roles.Returns(role is null ? [] : [role]);
        user.UserId.Returns(role is null ? null : Guid.NewGuid());
        return user;
    }
}
