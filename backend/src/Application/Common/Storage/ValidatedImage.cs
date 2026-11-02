namespace NhuNguyetSpa.Application.Common.Storage;

/// <summary>An uploaded image that passed <see cref="ImageUploadReader"/>: its bytes (rewound) and detected content type.</summary>
public sealed record ValidatedImage(MemoryStream Content, string ContentType) : IAsyncDisposable
{
    public ValueTask DisposeAsync() => Content.DisposeAsync();
}
