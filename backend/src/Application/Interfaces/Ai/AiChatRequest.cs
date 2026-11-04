using System.Text.Json;

namespace NhuNguyetSpa.Application.Interfaces.Ai;

/// <summary>One question for the model, with the tools it may call and the tool that ends the turn.</summary>
public sealed record AiChatRequest(
    string SystemPrompt,
    IReadOnlyList<AiChatTurn> History,
    string Question,
    IReadOnlyList<AiToolDefinition> Tools,
    string FinalToolName,
    int MaxToolRounds);

/// <summary>An earlier question and its answer, oldest first.</summary>
public sealed record AiChatTurn(string Question, string Answer);

/// <summary>A tool the model may call; <see cref="Parameters"/> is a JSON Schema object.</summary>
public sealed record AiToolDefinition(string Name, string Description, JsonElement Parameters);
