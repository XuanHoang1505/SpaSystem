using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Security;

namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>
/// Who is reading the catalog (BR-CAT-01): the owner sees every item; everyone else sees on-sale items and packages
/// inside their sale window on today's Vietnam date.
/// </summary>
public sealed class CatalogViewer
{
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;

    public CatalogViewer(ICurrentUserService currentUser, IDateTimeProvider clock)
    {
        _currentUser = currentUser;
        _clock = clock;
    }

    public bool IsOwner => _currentUser.IsAuthenticated && _currentUser.Roles.Contains(Roles.Owner);

    public DateOnly Today => SpaTime.Today(_clock.UtcNow);

    /// <summary>Null for the owner (no sale-window restriction), otherwise today.</summary>
    public DateOnly? PublicOn => IsOwner ? null : Today;
}
