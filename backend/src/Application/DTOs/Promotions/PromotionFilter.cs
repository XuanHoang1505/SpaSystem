namespace NhuNguyetSpa.Application.DTOs.Promotions;

/// <summary>Query of <c>GET /promotions</c>: <c>status=active|stopped</c>, and Vietnam days whose range the promotion must overlap.</summary>
public sealed class PromotionFilter
{
    public string? Status { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
}
