using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>customer_allergies</c> (thesis: DiUngKhachHang). See docs/domain/data-model.md.</summary>
public sealed class CustomerAllergy : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public string Allergen { get; set; } = string.Empty;
    public AllergySeverity Severity { get; set; }
    public string? Note { get; set; }
    public DateTime RecordedAtUtc { get; set; }
}
