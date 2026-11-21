using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>
/// Table <c>user_external_logins</c> (proposed; not in the thesis ERD). A Google account linked to a user, found by the
/// provider's stable subject (<c>sub</c>), never by email, because a Google email can change (docs/specs/auth.md, Q-84).
/// </summary>
public sealed class UserExternalLogin : BaseEntity, IHasCreatedAt
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public ExternalLoginProvider Provider { get; set; }
    public string ProviderKey { get; set; } = string.Empty;

    /// <summary>The provider's email when the account was linked; informational only.</summary>
    public string Email { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
}
