using System.Text.Json;

namespace NhuNguyetSpa.Application.Interfaces.Ai;

/// <summary>
/// The arguments of the final tool call, or <see cref="Blocked"/> when the provider's safety filter stopped the answer.
/// </summary>
public sealed record AiChatCompletion(JsonElement? FinalArguments, bool Blocked);
