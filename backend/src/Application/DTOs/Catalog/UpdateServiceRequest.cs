namespace NhuNguyetSpa.Application.DTOs.Catalog;

public sealed record UpdateServiceRequest(string Name, string Category, string? Description, int DurationMinutes, decimal Price) : IServiceFields;
