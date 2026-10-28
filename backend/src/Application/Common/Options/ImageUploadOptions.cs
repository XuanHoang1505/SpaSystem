namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>ImageUpload</c> (BR-CAT-08).</summary>
public sealed class ImageUploadOptions
{
    public const string SectionName = "ImageUpload";

    /// <summary>Request ceiling enforced by the image endpoints before the body is read; <see cref="MaxBytes"/> must not exceed it.</summary>
    public const long HardLimitBytes = 10 * 1024 * 1024;

    public long MaxBytes { get; set; } = 5 * 1024 * 1024;
}
