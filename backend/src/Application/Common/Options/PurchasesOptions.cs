namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Purchases</c>: "my services and packages", UC-SPA-18 (docs/specs/purchases-treatments.md).</summary>
public sealed class PurchasesOptions
{
    public const string SectionName = "Purchases";

    /// <summary>Safety cap on each list of <c>GET /me/purchases</c>, which is not paged (1–1000).</summary>
    public int MaxListItems { get; set; } = 200;
}
