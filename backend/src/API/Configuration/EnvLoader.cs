using Microsoft.Extensions.Configuration.Json;
using Microsoft.Extensions.Configuration.Memory;

namespace NhuNguyetSpa.API.Configuration;

/// <summary>
/// Loads <c>backend/src/API/.env</c> and maps UPPER_SNAKE_CASE variables onto configuration keys, following
/// FIN-Solution's EnvLoader: <c>CONNECTION_STRING</c> → <c>ConnectionStrings:Default</c>, <c>JWT_KEY</c> → <c>Jwt:SecretKey</c>,
/// <c>MAIL_SETTINGS_HOST</c> → <c>MailSettings:Host</c>, …
/// Precedence (lowest → highest): appsettings*.json, .env, real environment variables with the same UPPER name,
/// standard ASP.NET configuration (<c>Section__Key</c> variables, command line, test overrides).
/// </summary>
public static class EnvLoader
{
    public const string FileName = ".env";

    private static readonly IReadOnlyDictionary<string, string> ExplicitKeyMap =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["CONNECTION_STRING"] = "ConnectionStrings:Default",
            ["SWAGGER_ENABLED"] = "Swagger:Enabled",
        };

    private static readonly IReadOnlyDictionary<string, string> JwtKeyAliases =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["KEY"] = "SecretKey",
            ["ISSUER"] = "Issuer",
            ["AUDIENCE"] = "Audience",
            ["ACCESS_TOKEN_EXPIRATION"] = "AccessTokenExpirationMinutes",
            ["REFRESH_TOKEN_EXPIRATION"] = "RefreshTokenExpirationDays",
        };

    private static readonly IReadOnlyDictionary<string, string> MailKeyAliases =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["MAIL"] = "Mail",
            ["DISPLAY_NAME"] = "DisplayName",
            ["PASSWORD"] = "Password",
            ["HOST"] = "Host",
            ["PORT"] = "Port",
        };

    public static void Load(WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        var values = Read(builder.Environment.ContentRootPath);
        if (values.Count == 0) return;

        // Inserted right after the JSON files so .env beats appsettings, while env vars, command line
        // and WebApplicationFactory settings (added later) still win.
        var sources = ((IConfigurationBuilder)builder.Configuration).Sources;
        var lastJson = -1;
        for (var i = 0; i < sources.Count; i++)
            if (sources[i] is JsonConfigurationSource) lastJson = i;
        sources.Insert(lastJson + 1, new MemoryConfigurationSource { InitialData = values });
    }

    /// <summary>Reads the .env file (if any) under <paramref name="contentRoot"/> plus process variables and maps them to configuration keys.</summary>
    public static Dictionary<string, string?> Read(string contentRoot)
    {
        var raw = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var envFile = ResolveEnvFilePath(contentRoot);
        if (envFile is not null)
        {
            // NoEnvVars: parse only; do not leak .env values into the process environment.
            foreach (var pair in DotNetEnv.Env.NoEnvVars().Load(envFile))
                raw[pair.Key] = pair.Value;
        }

        foreach (System.Collections.DictionaryEntry entry in Environment.GetEnvironmentVariables())
        {
            if (entry.Key is string key && entry.Value is string value && ResolveConfigKey(key) is not null)
                raw[key] = value;
        }

        var mapped = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var (envKey, value) in raw)
        {
            if (ResolveConfigKey(envKey) is { } configKey && !string.IsNullOrWhiteSpace(value))
                mapped[configKey] = TrimEnvQuotes(value.Trim());
        }

        return mapped;
    }

    public static string? ResolveConfigKey(string envKey)
    {
        if (string.IsNullOrWhiteSpace(envKey)) return null;
        if (ExplicitKeyMap.TryGetValue(envKey, out var explicitKey)) return explicitKey;
        if (TryResolvePrefixedKey(envKey, "JWT_", "Jwt", JwtKeyAliases, out var jwtKey)) return jwtKey;
        if (TryResolvePrefixedKey(envKey, "MAIL_SETTINGS_", "MailSettings", MailKeyAliases, out var mailKey)) return mailKey;
        return null;
    }

    private static string? ResolveEnvFilePath(string contentRoot)
    {
        var candidates = new[]
        {
            Path.Combine(contentRoot, FileName),
            Path.Combine(Directory.GetCurrentDirectory(), FileName),
            Path.Combine(AppContext.BaseDirectory, FileName),
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    private static bool TryResolvePrefixedKey(string envKey, string prefix, string section,
        IReadOnlyDictionary<string, string> aliases, out string? configKey)
    {
        configKey = null;
        if (!envKey.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return false;
        var suffix = envKey[prefix.Length..];
        if (string.IsNullOrWhiteSpace(suffix)) return false;
        if (!aliases.TryGetValue(suffix, out var property))
            property = ToPascalCase(suffix);
        configKey = $"{section}:{property}";
        return true;
    }

    // VALUE_LIKE_THIS -> ValueLikeThis
    private static string ToPascalCase(string value) => string.Concat(value
        .Split('_', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(part => char.ToUpperInvariant(part[0]) + part[1..].ToLowerInvariant()));

    // Values wrapped in double quotes in .env (for example a Gmail app password).
    private static string TrimEnvQuotes(string value) =>
        value.Length >= 2 && value[0] == '"' && value[^1] == '"' ? value[1..^1] : value;
}
