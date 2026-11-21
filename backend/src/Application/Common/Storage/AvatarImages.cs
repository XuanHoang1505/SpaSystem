using System.Text.RegularExpressions;

namespace NhuNguyetSpa.Application.Common.Storage;

/// <summary>Where avatars live in the file storage (UC-SPA-04) and which Google profile photos may be copied there (Q-84).</summary>
public static partial class AvatarImages
{
    /// <summary>One avatar per user, overwritten on change.</summary>
    public static string PublicId(Guid userId) => $"avatars/{userId}";

    /// <summary>
    /// The Google profile photo as an HTTPS URL on Google's image host, asking for 512 px instead of Google's default 96 px;
    /// null for anything else, so the storage never fetches a URL that is not Google's.
    /// </summary>
    public static Uri? GooglePhotoUrl(string? pictureUrl)
    {
        if (!Uri.TryCreate(pictureUrl, UriKind.Absolute, out var url) || url.Scheme != Uri.UriSchemeHttps
            || !(url.Host == "googleusercontent.com" || url.Host.EndsWith(".googleusercontent.com", StringComparison.OrdinalIgnoreCase)))
            return null;
        // Google photo URLs end with a size option such as "=s96-c".
        var resized = SizeSuffix().Replace(url.AbsoluteUri, "=s512-c");
        return new Uri(resized);
    }

    [GeneratedRegex(@"=s\d+(-c)?$")]
    private static partial Regex SizeSuffix();
}
