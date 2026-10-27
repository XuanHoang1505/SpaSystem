namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>Fields shared by the create and update service requests, validated once by <c>ServiceFieldsValidator</c>.</summary>
public interface IServiceFields
{
    string Name { get; }
    string Category { get; }
    string? Description { get; }
    int DurationMinutes { get; }
    decimal Price { get; }
}
