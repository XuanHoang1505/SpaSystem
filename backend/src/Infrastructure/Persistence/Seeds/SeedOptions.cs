namespace NhuNguyetSpa.Infrastructure.Persistence.Seeds;

/// <summary>Section <c>Seed</c>, filled from <c>SEED_*</c> variables in .env (development only).</summary>
public sealed class SeedOptions
{
    public const string SectionName = "Seed";
    public const int MinimumPasswordLength = 8;

    public string? OwnerEmail { get; set; }
    public string? OwnerPassword { get; set; }
    public string? OwnerPhone { get; set; }
    public string OwnerFullName { get; set; } = "Chủ spa";

    /// <summary>Password of the demo staff and customer accounts (<c>--seed-demo</c>); falls back to <see cref="OwnerPassword"/>.</summary>
    public string? DemoPassword { get; set; }
}
