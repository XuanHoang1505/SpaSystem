namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary><see cref="Steps"/> left out keeps the current steps; a list (even empty) replaces them (BR-CAT-17).</summary>
public sealed record UpdateServiceRequest(string Name, Guid CategoryId, string? Description, int DurationMinutes, decimal Price) : IServiceFields
{
    public string? ShortDescription { get; init; }
    public IReadOnlyList<ServiceStepRequest>? Steps { get; init; }
}
