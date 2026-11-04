using System.Text.Json;

namespace NhuNguyetSpa.Application.UseCases.AiAssistant;

/// <summary>Reads <c>final_answer { scope, answer }</c>; anything else is a broken answer (BR-AI-09).</summary>
public static class AiFinalAnswer
{
    public static (AiAnswerScope Scope, string Answer) Parse(JsonElement? arguments)
    {
        if (arguments is not { ValueKind: JsonValueKind.Object } args ||
            !args.TryGetProperty("scope", out var scopeValue) || scopeValue.ValueKind != JsonValueKind.String ||
            !args.TryGetProperty("answer", out var answerValue) || answerValue.ValueKind != JsonValueKind.String)
            throw AiErrors.Unavailable();

        AiAnswerScope scope = scopeValue.GetString() switch
        {
            "in_scope" => AiAnswerScope.InScope,
            "out_of_scope" => AiAnswerScope.OutOfScope,
            "medical" => AiAnswerScope.Medical,
            _ => throw AiErrors.Unavailable(),
        };
        var answer = answerValue.GetString()!.Trim();
        if (scope == AiAnswerScope.InScope && answer.Length == 0)
            throw AiErrors.Unavailable();
        return (scope, answer);
    }
}
