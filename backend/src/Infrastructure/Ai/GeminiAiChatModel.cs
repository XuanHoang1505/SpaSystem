using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Interfaces.Ai;
using NhuNguyetSpa.Application.UseCases.AiAssistant;

namespace NhuNguyetSpa.Infrastructure.Ai;

/// <summary>
/// Gemini through the REST <c>generateContent</c> endpoint (no SDK). Function calling runs in mode <c>ANY</c>, so every
/// reply is a tool call; tool calls are looped here until the final tool. The model's turn is sent back unchanged, which
/// keeps Gemini 3 thought signatures valid. Only status codes and finish reasons are logged, never the conversation.
/// </summary>
public sealed class GeminiAiChatModel : IAiChatModel
{
    private static readonly HashSet<string> SafetyFinishReasons = ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"];

    private readonly HttpClient _http;
    private readonly AiProviderOptions _options;
    private readonly ILogger<GeminiAiChatModel> _logger;

    public GeminiAiChatModel(HttpClient http, IOptions<AiProviderOptions> options, ILogger<GeminiAiChatModel> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AiChatCompletion> CompleteAsync(AiChatRequest request, IAiToolInvoker tools, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogWarning("Gemini API key is not configured (GEMINI_API_KEY).");
            throw AiErrors.Unavailable();
        }

        var contents = new JsonArray();
        foreach (var turn in request.History)
        {
            contents.Add(TextContent("user", turn.Question));
            contents.Add(TextContent("model", turn.Answer));
        }
        contents.Add(TextContent("user", request.Question));

        for (var round = 0; ; round++)
        {
            var response = await SendAsync(BuildBody(request, contents), cancellationToken);
            if (IsBlocked(response))
                return new AiChatCompletion(null, true);

            var candidate = response.GetProperty("candidates")[0];
            var content = candidate.GetProperty("content");
            var calls = content.TryGetProperty("parts", out var parts)
                ? parts.EnumerateArray().Where(part => part.TryGetProperty("functionCall", out _))
                    .Select(part => part.GetProperty("functionCall")).ToList()
                : [];
            if (calls.FirstOrDefault(call => call.GetProperty("name").GetString() == request.FinalToolName) is { ValueKind: JsonValueKind.Object } final)
                return new AiChatCompletion(final.TryGetProperty("args", out var args) ? args.Clone() : null, false);
            if (calls.Count == 0 || round >= request.MaxToolRounds)
            {
                _logger.LogWarning("Gemini gave no final answer (finish reason {FinishReason}, round {Round}).",
                    candidate.TryGetProperty("finishReason", out var reason) ? reason.GetString() : null, round);
                throw AiErrors.Unavailable();
            }

            contents.Add(JsonNode.Parse(content.GetRawText()));
            var responses = new JsonArray();
            foreach (var call in calls)
            {
                var name = call.GetProperty("name").GetString()!;
                var arguments = call.TryGetProperty("args", out var callArgs) ? callArgs : EmptyObject();
                var result = await tools.InvokeAsync(name, arguments, cancellationToken);
                var functionResponse = new JsonObject { ["name"] = name, ["response"] = new JsonObject { ["result"] = JsonNode.Parse(result) } };
                if (call.TryGetProperty("id", out var id))
                    functionResponse["id"] = JsonNode.Parse(id.GetRawText());
                responses.Add(new JsonObject { ["functionResponse"] = functionResponse });
            }
            contents.Add(new JsonObject { ["role"] = "user", ["parts"] = responses });
        }
    }

    private JsonObject BuildBody(AiChatRequest request, JsonArray contents)
    {
        var declarations = new JsonArray();
        foreach (var tool in request.Tools)
        {
            declarations.Add(new JsonObject
            {
                ["name"] = tool.Name,
                ["description"] = tool.Description,
                ["parametersJsonSchema"] = JsonNode.Parse(tool.Parameters.GetRawText()),
            });
        }
        return new JsonObject
        {
            ["systemInstruction"] = new JsonObject { ["parts"] = new JsonArray(new JsonObject { ["text"] = request.SystemPrompt }) },
            ["contents"] = contents.DeepClone(),
            ["tools"] = new JsonArray(new JsonObject { ["functionDeclarations"] = declarations }),
            ["toolConfig"] = new JsonObject { ["functionCallingConfig"] = new JsonObject { ["mode"] = "ANY" } },
            ["generationConfig"] = new JsonObject { ["maxOutputTokens"] = _options.MaxOutputTokens },
        };
    }

    private async Task<JsonElement> SendAsync(JsonObject body, CancellationToken cancellationToken)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, $"models/{_options.Model}:generateContent")
        {
            Content = JsonContent.Create(body),
        };
        message.Headers.Add("x-goog-api-key", _options.ApiKey);
        try
        {
            using var response = await _http.SendAsync(message, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini returned HTTP {StatusCode}.", (int)response.StatusCode);
                throw AiErrors.Unavailable();
            }
            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            var json = JsonDocument.Parse(text).RootElement.Clone();
            if (!IsBlocked(json) && (!json.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0 ||
                                     !candidates[0].TryGetProperty("content", out _)))
            {
                _logger.LogWarning("Gemini returned no candidate content.");
                throw AiErrors.Unavailable();
            }
            return json;
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(exception, "Gemini request failed.");
            throw AiErrors.Unavailable();
        }
        catch (JsonException)
        {
            _logger.LogWarning("Gemini returned invalid JSON.");
            throw AiErrors.Unavailable();
        }
    }

    private static bool IsBlocked(JsonElement response) =>
        (response.TryGetProperty("promptFeedback", out var feedback) && feedback.TryGetProperty("blockReason", out _)) ||
        (response.TryGetProperty("candidates", out var candidates) && candidates.ValueKind == JsonValueKind.Array &&
         candidates.GetArrayLength() > 0 && candidates[0].TryGetProperty("finishReason", out var reason) &&
         SafetyFinishReasons.Contains(reason.GetString() ?? string.Empty));

    private static JsonObject TextContent(string role, string text) =>
        new() { ["role"] = role, ["parts"] = new JsonArray(new JsonObject { ["text"] = text }) };

    private static JsonElement EmptyObject() => JsonDocument.Parse("{}").RootElement.Clone();
}
