namespace NhuNguyetSpa.Domain.Common;

/// <summary>Entity with a UTC creation time that persistence fills in on insert.</summary>
public interface IHasCreatedAt
{
    DateTime CreatedAtUtc { get; set; }
}
