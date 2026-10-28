namespace NhuNguyetSpa.Application.DTOs.Catalog;

/// <summary>An uploaded file as the controller hands it over; <see cref="Content"/> is null when no file was sent.</summary>
public sealed record ImageUploadRequest(Stream? Content, long Length);
