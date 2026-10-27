namespace NhuNguyetSpa.Application.UseCases.Catalog;

/// <summary>Identifies JPEG, PNG and WebP from their magic bytes (BR-CAT-08); file names and Content-Type are not trusted.</summary>
public static class ImageFormatDetector
{
    public const int HeaderLength = 12;

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    /// <summary>The content type, or null when <paramref name="header"/> (at least the first 12 bytes) is not a supported image.</summary>
    public static string? Detect(ReadOnlySpan<byte> header)
    {
        if (header.Length < HeaderLength)
            return null;
        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return "image/jpeg";
        if (header.StartsWith(PngSignature))
            return "image/png";
        if (header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
            return "image/webp";
        return null;
    }
}
