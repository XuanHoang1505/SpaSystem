using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>owner_profiles</c> (thesis: ChuSpa). See docs/domain/data-model.md.</summary>
public sealed class OwnerProfile : BaseEntity
{
    public User User { get; set; } = null!;
    public string? Note { get; set; }
}
