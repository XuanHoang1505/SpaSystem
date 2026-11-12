using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NSubstitute;

namespace NhuNguyetSpa.Application.Tests.Catalog;

internal static class CatalogTestDoubles
{
    /// <summary>17:30 UTC on 26/10 is already 00:30 on 27/10 in Vietnam.</summary>
    public static readonly DateTime Now = new(2026, 10, 26, 17, 30, 0, DateTimeKind.Utc);

    public static readonly DateOnly VietnamToday = new(2026, 10, 27);

    public static CatalogViewer Viewer(string? role)
    {
        var user = Substitute.For<ICurrentUserService>();
        user.IsAuthenticated.Returns(role is not null);
        user.Roles.Returns(role is null ? [] : [role]);
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        return new CatalogViewer(user, clock);
    }

    public static CatalogViewer Owner() => Viewer(Roles.Owner);

    public static CatalogViewer Guest() => Viewer(null);
}
