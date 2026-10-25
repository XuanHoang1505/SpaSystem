using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>spa_profiles</c> (proposed; not in the thesis ERD). See docs/domain/data-model.md.</summary>
public sealed class SpaProfile : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Introduction { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? OpeningHours { get; set; }
    public string? Policies { get; set; }
}
