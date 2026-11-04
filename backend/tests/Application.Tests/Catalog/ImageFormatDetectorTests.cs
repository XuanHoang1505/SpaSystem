using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Catalog;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Catalog;

/// <summary>Magic-byte detection (BR-CAT-08, CAT-T29).</summary>
public sealed class ImageFormatDetectorTests
{
    public static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1];
    public static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 0x49];
    public static readonly byte[] Webp = [.."RIFF"u8, 0x24, 0, 0, 0, .."WEBP"u8, .."VP8 "u8];
    public static readonly byte[] Gif = [.."GIF89a"u8, 1, 0, 1, 0, 0x80, 0, 0];

    public static TheoryData<byte[], string?> Samples => new()
    {
        { Jpeg, "image/jpeg" },
        { Png, "image/png" },
        { Webp, "image/webp" },
        { Gif, null },
        { [.."RIFF"u8, 0x24, 0, 0, 0, .."WAVE"u8, .."fmt "u8], null },
        { [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0B, 0, 0, 0, 0, 0], null },
        { [0xFF, 0xD8, 0xFF], null },
        { [], null },
        { "xin chào thế giới"u8.ToArray(), null },
    };

    [Theory]
    [MemberData(nameof(Samples))]
    public void DetectsOnlyJpegPngAndWebp(byte[] header, string? expected) => ImageFormatDetector.Detect(header).Should().Be(expected);
}
