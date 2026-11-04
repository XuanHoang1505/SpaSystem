namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Ai</c>: assistant behaviour (docs/specs/ai-assistant.md, BR-AI-03…06, 08, Q-58, Q-61).</summary>
public sealed class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>Whole answer, every tool round included (5–120).</summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>Tool rounds before the model must give its final answer (1–10).</summary>
    public int MaxToolRounds { get; set; } = 4;

    /// <summary>Longest question after trimming (100–4000).</summary>
    public int MaxQuestionLength { get; set; } = 1000;

    /// <summary>Saved turns of the customer sent as context (0–20).</summary>
    public int HistoryTurnsInContext { get; set; } = 5;

    /// <summary>Products returned by <c>search_catalog</c> (1–20).</summary>
    public int SearchResultLimit { get; set; } = 5;

    /// <summary>Product cards in one answer (0–10).</summary>
    public int MaxSuggestions { get; set; } = 3;

    /// <summary>Booking cards in one answer (0–10).</summary>
    public int MaxBookingProposals { get; set; } = 3;

    public AiHistoryOptions History { get; set; } = new();

    public AiRateLimitOptions RateLimit { get; set; } = new();
}

/// <summary>Section <c>Ai:History</c>: paging of <c>GET /me/ai/history</c>.</summary>
public sealed class AiHistoryOptions
{
    public int DefaultLimit { get; set; } = 20;

    /// <summary>Largest <c>limit</c> (1–200).</summary>
    public int MaxLimit { get; set; } = 50;
}

/// <summary>Section <c>Ai:RateLimit</c>: per user, or per IP for guests (BR-AI-06).</summary>
public sealed class AiRateLimitOptions
{
    public int PermitLimit { get; set; } = 10;

    public int WindowSeconds { get; set; } = 60;

    /// <summary>Questions per Vietnam calendar day.</summary>
    public int DailyLimit { get; set; } = 50;
}
