namespace NhuNguyetSpa.Application.Interfaces.Storage;

/// <summary>
/// Stores public images (Cloudinary in production). <c>publicId</c> is relative, for example <c>services/{id}</c>; the
/// adapter adds its root folder. Failures surface as <c>ServiceUnavailableException</c> (image_storage_unavailable).
/// </summary>
public interface IFileStorage
{
    /// <summary>Uploads or overwrites the image under <paramref name="publicId"/> and returns its public HTTPS URL.</summary>
    Task<string> UploadImageAsync(Stream content, string publicId, string contentType, CancellationToken cancellationToken);

    /// <summary>
    /// Has the storage fetch the image at <paramref name="sourceUrl"/> itself (no download through the API) and store it
    /// under <paramref name="publicId"/>, overwriting; returns its public HTTPS URL. Used for Google profile photos (Q-84).
    /// </summary>
    Task<string> UploadImageFromUrlAsync(Uri sourceUrl, string publicId, CancellationToken cancellationToken);

    /// <summary>Deletes the image; an image that does not exist counts as deleted.</summary>
    Task DeleteAsync(string publicId, CancellationToken cancellationToken);
}
