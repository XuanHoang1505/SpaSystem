using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>otp_codes</c> (proposed; not in the thesis ERD). See docs/domain/data-model.md.</summary>
public sealed class OtpCode : BaseEntity, IHasCreatedAt
{
    public string Email { get; set; } = string.Empty;
    public OtpPurpose Purpose { get; set; }
    public string CodeHash { get; set; } = string.Empty;
    public string? PendingRegistration { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
