using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Validators.Promotions;

public static class PromotionQuery
{
    public const int MaxSearchLength = 100;

    /// <summary>active | stopped; blank means every status.</summary>
    public static bool TryParseStatus(string? status, out PromotionStatus? parsed)
    {
        switch (status?.Trim().ToLowerInvariant())
        {
            case null or "":
                parsed = null;
                return true;
            case "active":
                parsed = PromotionStatus.Active;
                return true;
            case "stopped":
                parsed = PromotionStatus.Stopped;
                return true;
            default:
                parsed = null;
                return false;
        }
    }
}
