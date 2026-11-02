namespace NhuNguyetSpa.Application.Validators.Users;

/// <summary>Parses the snake_case enum filters of <c>GET /users</c>; blank means no filter. Numbers are not accepted.</summary>
public static class UserQuery
{
    public const int MaxSearchLength = 100;

    public static bool TryParse<TEnum>(string? value, out TEnum? result) where TEnum : struct, Enum
    {
        result = null;
        var text = value?.Trim();
        if (string.IsNullOrEmpty(text))
            return true;
        if (!text.All(c => char.IsAsciiLetter(c) || c == '_') ||
            !Enum.TryParse<TEnum>(text.Replace("_", string.Empty, StringComparison.Ordinal), ignoreCase: true, out var parsed))
            return false;
        result = parsed;
        return true;
    }
}
