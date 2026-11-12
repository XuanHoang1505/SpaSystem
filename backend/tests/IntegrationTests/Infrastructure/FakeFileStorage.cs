using System.Collections.Concurrent;
using NhuNguyetSpa.Application.Interfaces.Storage;
using NhuNguyetSpa.Application.UseCases.Catalog;

namespace NhuNguyetSpa.IntegrationTests.Infrastructure;

/// <summary>Records uploads and deletes instead of calling Cloudinary; can be switched to fail like an outage.</summary>
public sealed class FakeFileStorage : IFileStorage
{
    private readonly ConcurrentQueue<(string PublicId, string ContentType, byte[] Bytes)> _uploads = new();
    private readonly ConcurrentQueue<string> _deletes = new();
    private int _version;

    public bool Fail { get; set; }

    public IReadOnlyCollection<(string PublicId, string ContentType, byte[] Bytes)> Uploads => _uploads.ToArray();

    public IReadOnlyCollection<string> Deletes => _deletes.ToArray();

    public async Task<string> UploadImageAsync(Stream content, string publicId, string contentType, CancellationToken cancellationToken)
    {
        if (Fail)
            throw CatalogErrors.ImageStorageUnavailable();
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, cancellationToken);
        _uploads.Enqueue((publicId, contentType, copy.ToArray()));
        return $"https://res.cloudinary.test/{publicId}?v={Interlocked.Increment(ref _version)}";
    }

    public Task DeleteAsync(string publicId, CancellationToken cancellationToken)
    {
        if (Fail)
            throw CatalogErrors.ImageStorageUnavailable();
        _deletes.Enqueue(publicId);
        return Task.CompletedTask;
    }
}
