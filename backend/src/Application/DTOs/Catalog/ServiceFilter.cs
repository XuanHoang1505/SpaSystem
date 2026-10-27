namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>Query-string filters for <c>GET /services</c>. <see cref="Status"/> (on_sale | discontinued) applies to the owner only.</summary>
public sealed class ServiceFilter
{
    public string? Category { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? Status { get; set; }
}
