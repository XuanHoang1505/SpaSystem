using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.AiAssistant;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.AiAssistant;

/// <summary>The fixed system prompt (docs/specs/ai-assistant.md: BR-AI-01, 02, 08, 09, AI-T13).</summary>
public sealed class AiAssistantPromptTests
{
    [Theory]
    [InlineData("Spa Như Nguyệt")]
    [InlineData("bác sĩ da liễu")]
    [InlineData("không chẩn đoán")]
    [InlineData("thuốc")]
    [InlineData("final_answer")]
    [InlineData("propose_booking")]
    [InlineData("tiếng Việt")]
    [InlineData("out_of_scope")]
    [InlineData("medical")]
    public void StatesTheRule(string fragment)
    {
        AiAssistantPrompt.System.Should().Contain(fragment);
    }
}
