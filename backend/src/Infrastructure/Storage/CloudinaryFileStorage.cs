using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Application.UseCases.Catalog;

namespace NhuNguyetSpa.Infrastructure.Storage;

/// <summary>
/// Stores images on Cloudinary under a fixed public id (BR-CAT-09): uploads overwrite and invalidate the CDN copy, so a
/// replaced image leaves nothing behind, and the returned secure URL carries a new version. Settings are read per call.
/// </summary>
public sealed class CloudinaryFileStorage : IFileStorage
{
    private readonly IOptions<CloudinaryOptions> _options;
    private readonly ILogger<CloudinaryFileStorage> _logger;

    public CloudinaryFileStorage(IOptions<CloudinaryOptions> options, ILogger<CloudinaryFileStorage> logger)
    {
        _options = options;
        _logger = logger;
    }

    public async Task<string> UploadImageAsync(Stream content, string publicId, string contentType, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(content);
        var (client, fullId) = Connect(publicId);
        var parameters = new ImageUploadParams
        {
            File = new FileDescription(fullId, content),
            PublicId = fullId,
            Overwrite = true,
            Invalidate = true,
            UseFilename = false,
            UniqueFilename = false,
        };
        var result = await CallAsync(() => client.UploadAsync(parameters, cancellationToken), "upload", fullId, cancellationToken);
        if (result.Error is not null || result.SecureUrl is null)
            throw Failed("upload", fullId, result.Error?.Message ?? $"HTTP {(int)result.StatusCode}");
        _logger.LogInformation("Uploaded image {PublicId} ({ContentType}, {Bytes} bytes)", fullId, contentType, result.Bytes);
        return result.SecureUrl.ToString();
    }

    public async Task DeleteAsync(string publicId, CancellationToken cancellationToken)
    {
        var (client, fullId) = Connect(publicId);
        var parameters = new DeletionParams(fullId) { ResourceType = ResourceType.Image, Invalidate = true };
        var result = await CallAsync(() => client.DestroyAsync(parameters), "delete", fullId, cancellationToken);
        // "not found" means the image is already gone, which is the state the caller wants.
        if (result.Error is not null || result.Result is not ("ok" or "not found"))
            throw Failed("delete", fullId, result.Error?.Message ?? result.Result ?? $"HTTP {(int)result.StatusCode}");
        _logger.LogInformation("Deleted image {PublicId} ({Result})", fullId, result.Result);
    }

    private (Cloudinary Client, string FullId) Connect(string publicId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(publicId);
        var settings = _options.Value;
        if (!settings.IsConfigured)
        {
            _logger.LogError("Cloudinary is not configured: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env");
            throw CatalogErrors.ImageStorageUnavailable();
        }

        var client = new Cloudinary(new Account(settings.CloudName, settings.ApiKey, settings.ApiSecret));
        client.Api.Secure = true;
        client.Api.Timeout = settings.TimeoutSeconds * 1000;
        var folder = settings.Folder.Trim('/');
        return (client, folder.Length == 0 ? publicId : $"{folder}/{publicId}");
    }

    private async Task<T> CallAsync<T>(Func<Task<T>> call, string action, string publicId, CancellationToken cancellationToken)
    {
        try
        {
            return await call();
        }
        catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            // Cloudinary exceptions carry no credentials; only the type and message are logged, never the options.
            throw Failed(action, publicId, $"{exception.GetType().Name}: {exception.Message}");
        }
    }

    private Exception Failed(string action, string publicId, string reason)
    {
        _logger.LogError("Cloudinary {Action} of {PublicId} failed: {Reason}", action, publicId, reason);
        return CatalogErrors.ImageStorageUnavailable();
    }
}
