namespace NhuNguyetSpa.Infrastructure.Ai;

/// <summary>
/// Section <c>Ai</c>, provider part (Q-57). <see cref="ApiKey"/> comes only from <c>GEMINI_API_KEY</c>; when it is empty the
/// API still starts and the chat endpoint answers <c>503 ai_unavailable</c>.
/// </summary>
public sealed class AiProviderOptions
{
    public const string SectionName = "Ai";
    public const string GeminiProvider = "gemini";

    public string Provider { get; set; } = GeminiProvider;

    public string Model { get; set; } = "gemini-3.5-flash-lite";

    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Longest model reply per request (256–8192).</summary>
    public int MaxOutputTokens { get; set; } = 2048;

    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta/";
}
