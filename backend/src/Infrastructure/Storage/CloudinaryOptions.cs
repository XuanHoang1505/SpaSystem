namespace NhuNguyetSpa.Infrastructure.Storage;

/// <summary>
/// Section <c>Cloudinary</c> (<c>CLOUDINARY_*</c> in .env). <c>CloudName</c>, <c>ApiKey</c> and <c>ApiSecret</c> come only from
/// .env and are checked on each image call, not at startup, so the API runs without them.
/// </summary>
public sealed class CloudinaryOptions
{
    public const string SectionName = "Cloudinary";

    public string CloudName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
    public string Folder { get; set; } = "nhunguyetspa";
    public int TimeoutSeconds { get; set; } = 30;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(CloudName) && !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(ApiSecret);
}
